import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { CopierEntity } from 'src/entities/copier.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import { TransactionDirection, TransactionEntity, TransactionStatus } from 'src/entities/transaction.entity';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { Between, DataSource, EntityManager, LessThanOrEqual, QueryRunner, Repository } from 'typeorm';

@Injectable()
export class UserStatisticCrawlerService {
  private readonly logger = new Logger(UserStatisticCrawlerService.name);

  private isUpdating = false; // Flag to prevent overlapping executions

  constructor(
    @InjectRepository(LeaderEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly leaderRepository: Repository<LeaderEntity>,
    @InjectRepository(CopierEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copierRepository: Repository<CopierEntity>,
    @InjectRepository(TransactionEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly hyperliquidService: HyperliquidService,
    private readonly configService: ApiConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updatePortfolioMetrics(): Promise<void> {
    // Only run in crawler mode
    if (!this.configService.isCrawlerMode()) {
      return;
    }

    // Prevent overlapping executions
    if (this.isUpdating) {
      this.logger.warn('Portfolio metrics update already in progress, skipping this execution');
      return;
    }

    this.isUpdating = true;
    this.logger.log('Starting portfolio metrics update for all users');

    const startTime = Date.now();

    try {
      // Update metrics for leaders
      await this.updateLeaderMetrics();

      // Update metrics for copiers
      await this.updateCopierMetrics();

      const duration = (Date.now() - startTime) / 1000;
      this.logger.log(`Portfolio metrics update completed in ${duration} seconds`);
    } catch (error) {
      this.logger.error(`Error updating portfolio metrics: ${error.message}`, error.stack);
    } finally {
      // Reset flag when done, regardless of success or failure
      this.isUpdating = false;
    }
  }

  /**
   * Update metrics for all leaders
   */
  private async updateLeaderMetrics(): Promise<void> {
    const leaders = await this.leaderRepository.find();
    this.logger.log(`Updating portfolio metrics for ${leaders.length} leaders`);

    for (const leader of leaders) {
      try {
        // Get the user's wallet address from the users table using the leader's userId
        const userQuery = await this.dataSource.query(`SELECT u.wallet_address FROM users u WHERE u.id = $1`, [
          leader.userId,
        ]);

        if (!userQuery || userQuery.length === 0 || !userQuery[0].wallet_address) {
          this.logger.warn(`Wallet address not found for leader with ID: ${leader.id}`);
          continue;
        }

        const walletAddress = userQuery[0].wallet_address;
        await this.updatePortfolioEntity(leader.id, walletAddress, 'leader');
      } catch (error) {
        this.logger.error(`Error updating metrics for leader ${leader.id}: ${error.message}`);
      }
    }
  }

  /**
   * Update metrics for all copiers
   */
  private async updateCopierMetrics(): Promise<void> {
    const copiers = await this.copierRepository.find();
    this.logger.log(`Updating portfolio metrics for ${copiers.length} copiers`);

    for (const copier of copiers) {
      try {
        await this.updatePortfolioEntity(copier.id, copier.fundWalletAddress, 'copier');
      } catch (error) {
        this.logger.error(`Error updating metrics for copier ${copier.id}: ${error.message}`);
      }
    }
  }

  /**
   * Update portfolio metrics for a specific entity (leader or copier)
   * @param entityId ID of the leader or copier
   * @param walletAddress Wallet address to fetch portfolio data for
   * @param entityType Type of entity ('leader' or 'copier')
   */
  private async updatePortfolioEntity(
    entityId: string,
    walletAddress: string,
    entityType: 'leader' | 'copier',
  ): Promise<void> {
    // Get portfolio data from Hyperliquid API
    const portfolioData = await this.hyperliquidService.getWalletPortfolio(walletAddress);

    if (!portfolioData || !portfolioData.length) {
      this.logger.warn(`No portfolio data found for ${entityType} ${entityId} (${walletAddress})`);
      return;
    }

    const portfolioMap = new Map<string, any>();
    for (const item of portfolioData) {
      portfolioMap.set(item[0], item[1]);
    }

    // Extract data for different time periods
    const day1Data = portfolioMap.get('perpDay');
    const day7Data = portfolioMap.get('perpWeek');
    const day30Data = portfolioMap.get('perpMonth');

    if (!day1Data || !day7Data || !day30Data) {
      this.logger.warn(`Incomplete portfolio data for ${entityType} ${entityId}`);
      return;
    }

    // Define date ranges for filtering the data
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Process data for each time period
    const metrics = {
      aum1d: await this.calculateAUM(day1Data, oneDayAgo, now),
      aum7d: await this.calculateAUM(day7Data, sevenDaysAgo, now),
      aum30d: await this.calculateAUM(day30Data, thirtyDaysAgo, now),
      pnl1d: await this.calculatePNL(day1Data, oneDayAgo, now),
      pnl7d: await this.calculatePNL(day7Data, sevenDaysAgo, now),
      pnl30d: await this.calculatePNL(day30Data, thirtyDaysAgo, now),
    };

    this.logger.log(`Calculated metrics for ${entityType} ${entityId}: AUM1d=${metrics.aum1d}, PNL1d=${metrics.pnl1d}`);
    this.logger.log(`Calculated metrics for ${entityType} ${entityId}: AUM7d=${metrics.aum7d}, PNL7d=${metrics.pnl7d}`);
    this.logger.log(
      `Calculated metrics for ${entityType} ${entityId}: AUM30d=${metrics.aum30d}, PNL30d=${metrics.pnl30d}`,
    );

    // Calculate ROI values
    const roi1d = metrics.aum1d !== 0 ? (metrics.pnl1d / metrics.aum1d) * 100 : 0;
    const roi7d = metrics.aum7d !== 0 ? (metrics.pnl7d / metrics.aum7d) * 100 : 0;
    const roi30d = metrics.aum30d !== 0 ? (metrics.pnl30d / metrics.aum30d) * 100 : 0;

    // Calculate win rates using the same date ranges
    const winRates = await this.calculateWinRates(entityId, entityType, oneDayAgo, sevenDaysAgo, thirtyDaysAgo);

    // Update the entity with new metrics
    await this.saveMetrics(entityId, entityType, {
      ...metrics,
      roi1d,
      roi7d,
      roi30d,
      ...winRates,
    });

    this.logger.log(`Updated portfolio metrics for ${entityType} ${entityId}`);
  }

  /**
   * Calculate AUM (Assets Under Management) from portfolio data
   * @param data Portfolio data for a specific time period
   * @param startDate Start date for filtering data points
   * @param endDate End date for filtering data points
   * @returns The average AUM value over the time period
   */
  private async calculateAUM(data: any, startDate: Date, endDate: Date): Promise<number> {
    if (!data || !data.accountValueHistory) {
      this.logger.warn(`No accountValueHistory found in data`);
      return 0;
    }

    // Format data properly, similar to leader chart service
    const formattedData = [];

    try {
      // Check if accountValueHistory exists and is an array
      if (Array.isArray(data.accountValueHistory)) {
        // Format data into objects with timestamp and value properties
        for (const item of data.accountValueHistory) {
          // Verify item is an array with at least 2 elements
          if (Array.isArray(item) && item.length >= 2) {
            formattedData.push({
              timestamp: new Date(item[0]),
              value: parseFloat(item[1]),
            });
          }
        }

        // Filter datapoints based on date range
        const filteredData = formattedData.filter(
          (point) => point.timestamp >= startDate && point.timestamp <= endDate,
        );

        // Log for debugging
        this.logger.log(`AUM data points: ${formattedData.length}, filtered: ${filteredData.length}`);

        // Make sure we have at least one data point
        if (filteredData.length === 0) {
          this.logger.warn(
            `No AUM data points found within date range ${startDate.toISOString()} to ${endDate.toISOString()}`,
          );
          return 0;
        }

        // Sum all AUM values within the date range
        const total = filteredData.reduce((sum, point) => sum + point.value, 0);

        // Calculate and return the average
        return total / filteredData.length;
      } else {
        this.logger.warn('accountValueHistory is not an array');
        return 0;
      }
    } catch (error) {
      this.logger.error(`Error calculating AUM: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate PNL (Profit and Loss) from portfolio data
   * @param data Portfolio data for a specific time period
   * @param startDate Start date for filtering data points
   * @param endDate End date for filtering data points
   * @returns The average PNL value over the time period
   */
  private async calculatePNL(data: any, startDate: Date, endDate: Date): Promise<number> {
    if (!data || !data.pnlHistory) {
      this.logger.warn(`No pnlHistory found in data`);
      return 0;
    }

    // Format data properly, similar to leader chart service
    const formattedData = [];

    try {
      // Check if pnlHistory exists and is an array
      if (Array.isArray(data.pnlHistory)) {
        // Format data into objects with timestamp and value properties
        for (const item of data.pnlHistory) {
          // Verify item is an array with at least 2 elements
          if (Array.isArray(item) && item.length >= 2) {
            formattedData.push({
              timestamp: new Date(item[0]),
              value: parseFloat(item[1]),
            });
          }
        }

        // Filter datapoints based on date range
        const filteredData = formattedData.filter(
          (point) => point.timestamp >= startDate && point.timestamp <= endDate,
        );

        // Log for debugging
        this.logger.log(`PNL data points: ${formattedData.length}, filtered: ${filteredData.length}`);

        // Make sure we have at least one data point
        if (filteredData.length === 0) {
          this.logger.warn(
            `No PNL data points found within date range ${startDate.toISOString()} to ${endDate.toISOString()}`,
          );
          return 0;
        }

        // Sum all PNL values within the date range
        const total = filteredData.reduce((sum, point) => sum + point.value, 0);

        // Calculate and return the average
        return total / filteredData.length;
      } else {
        this.logger.warn('pnlHistory is not an array');
        return 0;
      }
    } catch (error) {
      this.logger.error(`Error calculating PNL: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate win rates for different time periods
   * @param entityId ID of the leader or copier
   * @param entityType Type of entity ('leader' or 'copier')
   * @param oneDayAgo Date object for 1 day ago
   * @param sevenDaysAgo Date object for 7 days ago
   * @param thirtyDaysAgo Date object for 30 days ago
   * @returns Object with win rate values for each time period
   */
  private async calculateWinRates(
    entityId: string,
    entityType: 'leader' | 'copier',
    oneDayAgo: Date,
    sevenDaysAgo: Date,
    thirtyDaysAgo: Date,
  ): Promise<{ winRate1d: number; winRate7d: number; winRate30d: number }> {
    // Initialize win rate variables
    let winRate1d = 0;
    let winRate7d = 0;
    let winRate30d = 0;

    try {
      // Build query conditions based on entity type
      const conditions =
        entityType === 'leader'
          ? { leaderId: entityId, status: TransactionStatus.COMPLETED }
          : { copierId: entityId, status: TransactionStatus.COMPLETED };

      // Get transactions for different time periods
      const transactions1d = await this.transactionRepository.find({
        where: {
          ...conditions,
          createdAt: Between(oneDayAgo, new Date()),
        },
      });

      const transactions7d = await this.transactionRepository.find({
        where: {
          ...conditions,
          createdAt: Between(sevenDaysAgo, new Date()),
        },
      });

      const transactions30d = await this.transactionRepository.find({
        where: {
          ...conditions,
          createdAt: Between(thirtyDaysAgo, new Date()),
        },
      });

      // Calculate win rates for each time period
      winRate1d = this.calculateWinRate(transactions1d);
      winRate7d = this.calculateWinRate(transactions7d);
      winRate30d = this.calculateWinRate(transactions30d);
    } catch (error) {
      this.logger.error(`Error calculating win rates for ${entityType} ${entityId}: ${error.message}`);
    }

    return { winRate1d, winRate7d, winRate30d };
  }

  /**
   * Calculate win rate from a list of transactions
   * @param transactions List of completed transactions
   * @returns Win rate as a percentage
   */
  private calculateWinRate(transactions: TransactionEntity[]): number {
    if (!transactions.length) return 0;

    const winningTrades = transactions.filter((tx) => tx.closedPnl !== null && tx.closedPnl > 0).length;
    return (winningTrades / transactions.length) * 100;
  }

  /**
   * Save calculated metrics to the appropriate entity
   * @param entityId ID of the leader or copier
   * @param entityType Type of entity ('leader' or 'copier')
   * @param metrics Object containing all calculated metrics
   */
  private async saveMetrics(
    entityId: string,
    entityType: 'leader' | 'copier',
    metrics: {
      aum1d: number;
      aum7d: number;
      aum30d: number;
      pnl1d: number;
      pnl7d: number;
      pnl30d: number;
      roi1d: number;
      roi7d: number;
      roi30d: number;
      winRate1d: number;
      winRate7d: number;
      winRate30d: number;
    },
  ): Promise<void> {
    try {
      if (entityType === 'leader') {
        await this.leaderRepository.update(entityId, metrics);
      } else {
        await this.copierRepository.update(entityId, metrics);
      }
    } catch (error) {
      this.logger.error(`Error saving metrics for ${entityType} ${entityId}: ${error.message}`);
      throw error;
    }
  }
}
