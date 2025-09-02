import { COMMON_CONSTANT } from '../../constants/common.constant';
import { ERROR } from '../../constants/exception.constant';
import { LeaderEntity } from '../../entities/leader.entity';
import { HyperliquidService } from '../hyperliquid/hyperliquid.service';
import { ChartDataType, ChartDateRange, GetLeaderChartRequestDto } from './dto/get-leader-chart-request.dto';
import { ChartDataPoint, GetLeaderChartResponseDto } from './dto/get-leader-chart-response.dto';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { KeyvAdapter } from 'cache-manager';
import type { Redis } from 'ioredis';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class LeaderChartService {
  private readonly logger = new Logger(LeaderChartService.name);
  private redisInstance: Redis;
  private readonly CACHE_PREFIX = 'EMULATE:LEADER_CHART:';
  private readonly CACHE_TTL = 60 * 30; // 30 minutes

  constructor(
    private readonly hyperliquidService: HyperliquidService,
    @InjectRepository(LeaderEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly leaderRepository: Repository<LeaderEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {
    this.redisInstance = this.redisService.getClient(COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE);
  }

  /**
   * Get chart data for a leader
   * @param query Query parameters including leader ID, chart type, and date range
   * @returns Chart data response with daily data points
   */
  async getLeaderChartData(query: GetLeaderChartRequestDto): Promise<GetLeaderChartResponseDto> {
    const { leaderId, type, dateRange } = query;
    this.logger.log(`Getting ${type} chart data for leader ${leaderId} with range ${dateRange}`);

    // Create a unique cache key based on query parameters
    const cacheKey = `${this.CACHE_PREFIX}${leaderId}:${type}:${dateRange}`;

    try {
      // Try to get data from cache first
      const cachedData = await this.redisInstance.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Using cached chart data for leader ${leaderId}`);
        return JSON.parse(cachedData);
      }

      // If not in cache, proceed to fetch the data
      // Verify the leader exists
      const leader = await this.findLeaderById(leaderId);

      const walletAddress = leader.walletAddress;
      const portfolio = await this.hyperliquidService.getWalletPortfolio(walletAddress);
      const portfolioSet = new Map<string, any>(); // key - obj

      for (const item of portfolio) {
        portfolioSet.set(item[0], item[1]);
      }

      let dataToProcess = {};

      const allTimeData: string[] = [];

      switch (dateRange) {
        case ChartDateRange.DAY_1: {
          dataToProcess = portfolioSet.get('perpDay');
          // generate all time data by every hour of today
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          const timeDiff = endOfDay.getTime() - startOfDay.getTime();
          const interval = timeDiff / 24;
          for (let i = 0; i < 24; i++) {
            allTimeData.push(new Date(startOfDay.getTime() + i * interval).toString());
          }
          break;
        }
        case ChartDateRange.DAY_7: {
          dataToProcess = portfolioSet.get('perpWeek');
          // generate all time data by every day from today to 7 day ago
          const currentDate = new Date();
          const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          const dayInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds

          for (let i = 0; i < 7; i++) {
            const timestamp = sevenDaysAgo.getTime() + i * dayInterval;
            allTimeData.push(new Date(timestamp).toString());
          }
          break;
        }

        case ChartDateRange.DAY_30: {
          dataToProcess = portfolioSet.get('perpMonth');
          const currentDate = new Date();
          const sevenDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          const dayInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds

          for (let i = 0; i < 30; i++) {
            const timestamp = sevenDaysAgo.getTime() + i * dayInterval;
            allTimeData.push(new Date(timestamp).toString());
          }
          break;
        }
        default:
          throw new Error('Invalid date range');
      }
      const formattedData = {};

      for (const key in dataToProcess) {
        if (key === 'vlm') continue;
        for (const e of dataToProcess[key]) {
          if (!formattedData[key]) {
            formattedData[key] = [];
          }

          formattedData[key].push({
            timestamp: new Date(e[0]),
            value: e[1],
          });
        }
      }
      const returnData = [];

      for (const e of allTimeData) {
        switch (type) {
          case ChartDataType.PNL:
            const data = formattedData['pnlHistory'];
            if (data && data.length > 0) {
              // Find the closest data point that is LESS than or equal to the target timestamp
              const targetTime = new Date(e).getTime();
              let closestData = null;
              let maxTimeLessThanTarget = -Infinity;

              // Iterate through all data points to find the closest one that is before target time
              for (let i = 0; i < data.length; i++) {
                const dataTime = data[i].timestamp.getTime();
                if (dataTime <= targetTime && dataTime > maxTimeLessThanTarget) {
                  closestData = data[i];
                  maxTimeLessThanTarget = dataTime;
                }
              }

              // If no data point is found before target time, use the earliest data point
              if (!closestData && data.length > 0) {
                closestData = data[0];
              }
              returnData.push({
                timestamp: new Date(e),
                value: closestData.value,
              });
            } else {
              // If no data available, push a zero value
              returnData.push({
                timestamp: new Date(e),
                value: 0,
              });
            }
            break;
          case ChartDataType.ROI:
            const pnlData = formattedData['pnlHistory'];
            const aumData = formattedData['accountValueHistory'];

            if (pnlData && pnlData.length > 0 && aumData && aumData.length > 0) {
              // Find the closest PNL data point
              const targetTime = new Date(e).getTime();

              // Find closest PNL data point that is LESS than or equal to the target timestamp
              let closestPnlData = null;
              let maxPnlTimeLessThanTarget = -Infinity;

              for (let i = 0; i < pnlData.length; i++) {
                const dataTime = pnlData[i].timestamp.getTime();
                if (dataTime <= targetTime && dataTime > maxPnlTimeLessThanTarget) {
                  closestPnlData = pnlData[i];
                  maxPnlTimeLessThanTarget = dataTime;
                }
              }

              // If no data point is found before target time, use the earliest data point
              if (!closestPnlData && pnlData.length > 0) {
                closestPnlData = pnlData[0];
              }

              // Find closest AUM data point that is LESS than or equal to the target timestamp
              let closestAumData = null;
              let maxAumTimeLessThanTarget = -Infinity;

              for (let i = 0; i < aumData.length; i++) {
                const dataTime = aumData[i].timestamp.getTime();
                if (dataTime <= targetTime && dataTime > maxAumTimeLessThanTarget) {
                  closestAumData = aumData[i];
                  maxAumTimeLessThanTarget = dataTime;
                }
              }

              // If no data point is found before target time, use the earliest data point
              if (!closestAumData && aumData.length > 0) {
                closestAumData = aumData[0];
              }

              // Calculate ROI as (PNL / AUM) * 100 if AUM is not zero
              let roiValue = 0;
              if (closestAumData.value !== 0) {
                roiValue = (closestPnlData.value / closestAumData.value) * 100;
              }

              returnData.push({
                timestamp: new Date(e),
                value: roiValue || 0,
              });
            } else {
              returnData.push({
                timestamp: new Date(e),
                value: 0,
              });
            }
            break;
          case ChartDataType.AUM:
            const accountValueHistory = formattedData['accountValueHistory'];
            if (accountValueHistory && accountValueHistory.length > 0) {
              // Find the closest data point that is LESS than or equal to the target timestamp
              const targetTime = new Date(e).getTime();
              let closestAumData = null;
              let maxTimeLessThanTarget = -Infinity;

              // Iterate through all data points to find the closest one that is before target time
              for (let i = 0; i < accountValueHistory.length; i++) {
                const dataTime = accountValueHistory[i].timestamp.getTime();
                if (dataTime <= targetTime && dataTime > maxTimeLessThanTarget) {
                  closestAumData = accountValueHistory[i];
                  maxTimeLessThanTarget = dataTime;
                }
              }

              // If no data point is found before target time, use the earliest data point
              if (!closestAumData && accountValueHistory.length > 0) {
                closestAumData = accountValueHistory[0];
              }

              returnData.push({
                timestamp: new Date(e),
                value: closestAumData.value,
              });
            } else {
              // If no data available, push a zero value
              returnData.push({
                timestamp: new Date(e),
                value: 0,
              });
            }
            break;
        }
      }

      const response = {
        leaderId,
        type,
        dateRange,
        data: returnData,
      };

      // Cache the result
      await this.redisInstance.set(cacheKey, JSON.stringify(response), 'EX', this.CACHE_TTL);
      return response;
    } catch (error) {
      this.logger.error(`Error getting chart data: ${error.message}`, error.stack);
      return {
        leaderId,
        type,
        dateRange,
        data: [],
      };
    }
  }

  /**
   * Find a leader by ID
   * @param leaderId The leader ID to look up
   * @returns The leader entity if found, otherwise throws NotFoundException
   */
  private async findLeaderById(leaderId: string): Promise<{ id: string; userId: string; walletAddress: string }> {
    // First get the leader to ensure it exists and get userId
    const leader = await this.leaderRepository.findOne({
      where: { id: leaderId },
    });

    if (!leader) {
      throw new NotFoundException({
        message: `${ERROR.LEADER_NOT_FOUND.message}: ${leaderId}`,
        code: ERROR.LEADER_NOT_FOUND.code,
      });
    }

    // Then get the user's wallet address using the userId from the leader
    const userQuery = await this.dataSource.query(`SELECT u.wallet_address FROM users u WHERE u.id = $1`, [
      leader.userId,
    ]);

    if (!userQuery || userQuery.length === 0 || !userQuery[0].wallet_address) {
      throw new NotFoundException({
        message: `Wallet address not found for leader with ID: ${leaderId}`,
        code: ERROR.USER_NOT_EXIST.code,
      });
    }

    return {
      id: leader.id,
      userId: leader.userId,
      walletAddress: userQuery[0].wallet_address,
    };
  }
}
