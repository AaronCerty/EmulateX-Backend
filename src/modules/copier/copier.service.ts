import { COMMON_CONSTANT } from '../../constants/common.constant';
import { ERROR } from '../../constants/exception.constant';
import { CopierEntity } from '../../entities/copier.entity';
import { CopyTradeSessionEntity } from '../../entities/copy-trade-session.entity';
import { LeaderEntity } from '../../entities/leader.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import { JwtPayload } from '../../shared/dto/jwt-payload.dto';
import { BaseException } from '../../shared/filters/exception.filter';
import { HyperliquidService } from '../hyperliquid/hyperliquid.service';
import { ChartDataType, ChartDateRange, GetCopierChartRequestDto } from './dto/get-copier-chart-request.dto';
import { ChartDataPoint, GetCopierChartResponseDto } from './dto/get-copier-chart-response.dto';
import { GetCopierTransactionsRequestDto } from './dto/get-copier-transactions-request.dto';
import { GetCopierTransactionsResponseDto, TransactionItemDto } from './dto/get-copier-transactions-response.dto';
import { GetMyCopierChartRequestDto } from './dto/get-my-copier-chart-request.dto';
import { GetMyCopierResponseDto } from './dto/get-my-copier-response.dto';
import { GetMyCopierTransactionsRequestDto } from './dto/get-my-copier-transactions-request.dto';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { GetCopyingLeadersResponseDto } from 'src/modules/copier/dto/get-copying-leaders-response.dto';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class CopierService {
  private readonly logger = new Logger(CopierService.name);
  private redisInstance: Redis;
  private readonly CACHE_PREFIX = 'EMULATE:COPIER_CHART:';
  private readonly CACHE_TTL = 60 * 30; // 30 minutes

  constructor(
    @InjectRepository(CopierEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copierRepository: Repository<CopierEntity>,
    @InjectRepository(TransactionEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(CopyTradeSessionEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copyTradeSessionRepository: Repository<CopyTradeSessionEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly hyperliquidService: HyperliquidService,
    private readonly redisService: RedisService,
  ) {
    this.redisInstance = this.redisService.getClient(COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE);
  }

  async getCopierChart(query: GetCopierChartRequestDto, copierId?: string): Promise<GetCopierChartResponseDto> {
    const { type, dateRange } = query;
    this.logger.log(`Getting ${type} chart data for copier ${copierId || 'all'} with range ${dateRange}`);

    // Create a unique cache key based on query parameters
    const cacheKey = `${this.CACHE_PREFIX}${copierId || 'all'}:${type}:${dateRange}`;

    try {
      // Try to get data from cache first
      const cachedData = await this.redisInstance.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Using cached chart data for copier ${copierId || 'all'}`);
        return JSON.parse(cachedData);
      }

      // If not in cache, proceed to fetch the data
      // If copierId is provided, verify the copier exists
      let walletAddress: string;

      const copier = await this.copierRepository.findOne({
        where: { id: copierId },
      });

      if (!copier) {
        throw new NotFoundException({
          message: `${ERROR.COPIER_NOT_FOUND.message}: ${copierId}`,
          code: ERROR.COPIER_NOT_FOUND.code,
        });
      }

      walletAddress = copier.fundWalletAddress;

      // Fetch wallet portfolio data from Hyperliquid API
      const portfolio = await this.hyperliquidService.getWalletPortfolio(walletAddress);
      const portfolioSet = new Map<string, any>();

      for (const item of portfolio) {
        portfolioSet.set(item[0], item[1]);
      }

      let dataToProcess = {};
      const allTimeData: string[] = [];

      switch (dateRange) {
        case ChartDateRange.DAY_1: {
          dataToProcess = portfolioSet.get('perpDay');
          // Generate all time data by every hour of today
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
          // Generate all time data by every day from today to 7 days ago
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
          const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          const dayInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds

          for (let i = 0; i < 30; i++) {
            const timestamp = thirtyDaysAgo.getTime() + i * dayInterval;
            allTimeData.push(new Date(timestamp).toString());
          }
          break;
        }
        default:
          throw new Error('Invalid date range');
      }

      // Format the data for processing
      const formattedData = {};

      if (dataToProcess) {
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
      }
      console.log(formattedData);
      const returnData = [];

      for (const e of allTimeData) {
        switch (type) {
          case ChartDataType.PNL: {
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
          }

          case ChartDataType.ROI: {
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
          }

          case ChartDataType.AUM: {
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
      }
      const response = {
        copierId,
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
        copierId: copierId,
        type,
        dateRange,
        data: [],
      };
    }
  }

  /**
   * Get chart data for the authenticated user's copier
   * @param query Query parameters for chart type and time range
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns Chart data response
   */
  async getMyCopierChart(
    query: GetMyCopierChartRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetCopierChartResponseDto> {
    // Find copier by userId from JWT token to verify the user has a copier
    const copier = await this.copierRepository.findOne({
      where: { userId: jwtPayload.userId },
    });

    if (!copier) {
      throw new BaseException(ERROR.COPIER_NOT_FOUND);
    }

    // Call the standard chart function with the query parameters
    return this.getCopierChart(query, copier.id);
  }

  /**
   * Get authenticated user's copier details
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns Copier details with portfolio metrics
   */
  async getMyCopier(jwtPayload: JwtPayload): Promise<GetMyCopierResponseDto> {
    const { userId, walletAddress } = jwtPayload;

    // Find copier with user data
    const copier = await this.copierRepository.findOne({
      where: { userId },
    });

    if (!copier) {
      throw new BaseException(ERROR.COPIER_NOT_FOUND);
    }

    // Create response object with data from both user and copier
    // Include all portfolio metrics for a complete profile
    const response: GetMyCopierResponseDto = {
      id: copier.id,
      userId: userId,
      walletAddress: walletAddress,
      fundWalletAddress: copier.fundWalletAddress,
      totalBalance: copier.totalBalance,

      // AUM fields
      aum1d: copier.aum1d,
      aum7d: copier.aum7d,
      aum30d: copier.aum30d,

      // PNL metrics
      pnl1d: copier.pnl1d,
      pnl7d: copier.pnl7d,
      pnl30d: copier.pnl30d,

      // ROI metrics
      roi1d: copier.roi1d,
      roi7d: copier.roi7d,
      roi30d: copier.roi30d,

      // Win rate metrics
      winRate1d: copier.winRate1d,
      winRate7d: copier.winRate7d,
      winRate30d: copier.winRate30d,

      // Additional fields
      historySynced: copier.historySynced,
      createdAt: copier.createdAt,
      updatedAt: copier.updatedAt,
    };

    return response;
  }

  /**
   * Get transactions for a copier with pagination and filtering
   * @param query Query parameters with copierId, pagination, and filtering
   * @returns Paginated list of transactions
   */
  async getCopierTransactions(query: GetCopierTransactionsRequestDto): Promise<GetCopierTransactionsResponseDto> {
    try {
      const { copierId, page, limit, type } = query;
      this.logger.log(`Getting transactions for copier ${copierId} (page ${page}, limit ${limit}, type ${type})`);

      // Verify copier exists
      const copierExists = await this.copierRepository.findOne({ where: { id: copierId } });
      if (!copierExists) {
        this.logger.error(`Copier not found with ID: ${copierId}`);
        throw new NotFoundException(ERROR.COPIER_NOT_FOUND);
      }

      // Build query conditions for copier transactions using query builder
      // Create query builder to properly handle snake_case field names
      const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');

      // Apply copier filter with correct snake_case field name
      queryBuilder.where('transaction.copier_id = :copierId', { copierId });

      // Apply transaction type filter if not 'ALL'
      if (type !== 'ALL') {
        queryBuilder.andWhere('transaction.type = :type', { type });
      }

      // Get total count for pagination
      const total = await queryBuilder.getCount();
      this.logger.log(`Found ${total} total transactions matching criteria`);

      // Apply pagination and sorting
      const skip = (page - 1) * limit;

      // Use query builder to properly cast timestampMs to numeric for correct sorting
      const copierTransactions = await queryBuilder
        .orderBy('CAST(transaction.timestamp_ms AS BIGINT)', 'DESC', 'NULLS LAST')
        .skip(skip)
        .take(limit)
        .getMany();

      this.logger.log(`Retrieved ${copierTransactions.length} transactions for page ${page}`);

      // Prepare array to hold the final transaction items with leader data
      const transactionItems: TransactionItemDto[] = [];

      // Process each copier transaction
      for (const transaction of copierTransactions) {
        // Create the base transaction item
        const transactionItem: TransactionItemDto = {
          id: transaction.id,
          chainId: transaction.chainId,
          base: transaction.base,
          quote: transaction.quote,
          amount: Number(transaction.amount),
          price: Number(transaction.price),
          totalValue: Number(transaction.totalValue),
          direction: transaction.direction,
          type: transaction.type,
          status: transaction.status,
          transactionHash: transaction.transactionHash,
          timestampMs: Number(transaction.timestampMs),
          errorMessage: transaction.errorMessage,
          createdAt: transaction.createdAt,
          metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
          copyFromTransaction: transaction.copyFromTransaction,
        };

        // If this transaction was copied from another transaction, get the leader data
        if (transaction.copyFromTransaction) {
          // Find the leader transaction that this copier transaction was copied from
          const leaderTransaction = await this.transactionRepository.findOne({
            where: { id: transaction.copyFromTransaction },
          });

          // If leader transaction exists and has a leaderId, get the leader data
          if (leaderTransaction && leaderTransaction.leaderId) {
            // Find the leader data
            const leader = await this.dataSource.getRepository(LeaderEntity).findOne({
              where: { id: leaderTransaction.leaderId },
              select: ['id', 'name', 'avt', 'imageUrl', 'riskLevel', 'leaderType'],
            });

            // Add leader data to the transaction item if found
            if (leader) {
              transactionItem.leader = {
                id: leader.id,
                name: leader.name,
                avt: leader.avt,
                imageUrl: leader.imageUrl,
                riskLevel: leader.riskLevel,
                leaderType: leader.leaderType,
              };
            }
          }
        }

        // Add the transaction item to the array
        transactionItems.push(transactionItem);
      }

      return {
        copierId,
        transactions: transactionItems,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Error getting copier transactions: ${error.message}`, error.stack);
      if (error.status === 404) throw error; // Re-throw NotFoundException
      throw new Error(`Failed to get copier transactions: ${error.message}`);
    }
  }

  /**
   * Get transactions for the authenticated user's copier
   * @param query Query parameters with pagination and filtering
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns Paginated list of transactions
   */
  async getMyCopierTransactions(
    query: GetMyCopierTransactionsRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetCopierTransactionsResponseDto> {
    // Find copier by userId from JWT token
    const copier = await this.copierRepository.findOne({
      where: { userId: jwtPayload.userId },
    });

    if (!copier) {
      throw new BaseException(ERROR.COPIER_NOT_FOUND);
    }

    // Call the standard transactions function with the found copierId
    return this.getCopierTransactions({
      ...query,
      copierId: copier.id,
    });
  }

  /**
   * Get current positions for a copier
   * @param copierId ID of the copier
   * @returns Current positions from Hyperliquid
   */
  async getCopierPositions(copierId: string) {
    // Verify copier exists and get wallet address
    const copier = await this.copierRepository.findOne({ where: { id: copierId } });
    if (!copier) {
      throw new NotFoundException(ERROR.COPIER_NOT_FOUND);
    }

    return this.hyperliquidService.getUserActivePositions(copier.fundWalletAddress);
  }

  /**
   * Get current positions for the authenticated user's copier
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns Current positions from Hyperliquid
   */
  async getMyCopierPositions(jwtPayload: JwtPayload) {
    // Find copier by userId from JWT token
    const copier = await this.copierRepository.findOne({
      where: { userId: jwtPayload.userId },
    });

    if (!copier) {
      throw new BaseException(ERROR.COPIER_NOT_FOUND);
    }

    // Call the standard positions function with the found copierId
    return this.getCopierPositions(copier.id);
  }

  /**
   * Get all leaders that a copier is following
   * @param copierId ID of the copier
   * @returns List of leader IDs
   */
  async getCopyingLeaders(copierId: string): Promise<GetCopyingLeadersResponseDto> {
    // Verify copier exists
    const copier = await this.copierRepository.findOne({ where: { id: copierId } });
    if (!copier) {
      throw new NotFoundException({
        message: `${ERROR.COPIER_NOT_FOUND.message}: ${copierId}`,
        code: ERROR.COPIER_NOT_FOUND.code,
      });
    }

    try {
      // Find all active copy trade sessions for this copier
      const sessions = await this.copyTradeSessionRepository.find({
        where: {
          copierId: copierId,
          isActive: true,
        },
      });

      // Extract leader IDs from the sessions
      const leaderIds = sessions.map((session) => session.leaderId);

      // Estimate current PnL of copy trade session
      const estimatePnLs = [];
      for (const ss of sessions) {
        const copier = await this.copierRepository.findOne({
          where: {
            id: ss.copierId,
          },
        });
        const fundWalletPerpBalance = await this.hyperliquidService.getPerpBalanceOfWalletAddress(
          copier.fundWalletAddress,
        );
        const pnl = Number(fundWalletPerpBalance) - Number(ss.amount);
        estimatePnLs.push(pnl);
      }

      return { leaderIds, copyTradeSession: sessions, estimatePnLs };
    } catch (error) {
      this.logger.error(`Error fetching copying leaders for copier ${copierId}: ${error.message}`, error.stack);
      return { leaderIds: [], copyTradeSession: [], estimatePnLs: [] };
    }
  }

  /**
   * Get all leaders that the authenticated user's copier is following
   * @param jwtPayload JWT payload containing authenticated user data
   * @returns List of leader IDs
   */
  async getMyCopyingLeaders(jwtPayload: JwtPayload): Promise<GetCopyingLeadersResponseDto> {
    // Find copier by userId from JWT token
    const copier = await this.copierRepository.findOne({
      where: { userId: jwtPayload.userId },
    });

    if (!copier) {
      throw new NotFoundException({
        message: `Copier not found for user: ${jwtPayload.userId}`,
        code: ERROR.COPIER_NOT_FOUND.code,
      });
    }

    // Use the getCopyingLeaders method with the found copier's ID
    return this.getCopyingLeaders(copier.id);
  }
}
