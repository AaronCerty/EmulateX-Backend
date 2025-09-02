import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { CHAIN_ID, COMMON_CONSTANT } from 'src/constants/common.constant';
import {
  TransactionDirection,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from 'src/entities/transaction.entity';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

@Injectable()
export class UserTransactionCrawlerService {
  private readonly logger = new Logger(UserTransactionCrawlerService.name);
  private checkInterval: NodeJS.Timeout | null = null;
  private isSyncWsRunning = false;
  private isSyncHistoryRunning = false;

  constructor(
    private readonly hyperliquidService: HyperliquidService,
    private readonly configService: ApiConfigService,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async syncHyperliquidWsConnection() {
    if (!this.configService.isCrawlerMode()) {
      return;
    }

    // Check if already running
    if (this.isSyncWsRunning) {
      this.logger.log('WebSocket sync already in progress, skipping');
      return;
    }

    // Set the flag to indicate that the job is running
    this.isSyncWsRunning = true;

    try {
      this.hyperliquidService.syncWsConnections();
    } catch (error) {
      this.logger.error(`Error syncing WebSocket connections: ${error.message}`, error.stack);
    } finally {
      // Reset the flag when done
      this.isSyncWsRunning = false;
    }
  }

  /**
   * Cleanup method to be called when the application is shutting down
   */
  onApplicationShutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.logger.log('Stopped periodic user check');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncHistoricalTransactions(): Promise<void> {
    if (!this.configService.isCrawlerMode()) {
      return;
    }

    // Check if already running
    if (this.isSyncHistoryRunning) {
      this.logger.log('Historical transaction sync already in progress, skipping');
      return;
    }

    // Set the flag to indicate that the job is running
    this.isSyncHistoryRunning = true;

    try {
      this.logger.log('Starting historical transaction sync process');

      // Get all leaders that need history sync (not yet synced)
      const leaders = await this.dataSource.manager.query(`
        SELECT l.id as leader_id, u.wallet_address 
        FROM leaders l 
        INNER JOIN users u ON u.id = l.user_id 
        WHERE u.wallet_address IS NOT NULL AND l.history_synced = false
      `);

      // Get all copiers that need history sync (not yet synced)
      const copiers = await this.dataSource.manager.query(`
        SELECT c.id as copier_id, c.fund_wallet_address as wallet_address
        FROM copiers c 
        WHERE c.fund_wallet_address IS NOT NULL AND c.history_synced = false
      `);

      this.logger.log(
        `Found ${leaders.length} leaders and ${copiers.length} copiers that need historical transaction sync`,
      );

      // Process leaders
      for (const leader of leaders) {
        await this.syncUserHistoricalTransactions(leader.wallet_address, leader.leader_id, null);
      }

      // Process copiers
      for (const copier of copiers) {
        await this.syncUserHistoricalTransactions(copier.wallet_address, null, copier.copier_id);
      }

      this.logger.log('Historical transaction sync process completed');
    } catch (error) {
      this.logger.error(`Error syncing historical transactions: ${error.message}`, error.stack);
    } finally {
      // Reset the flag when done
      this.isSyncHistoryRunning = false;
    }
  }

  /**
   * Sync historical transactions for a specific user (leader or copier)
   * @param walletAddress Wallet address of the user
   * @param leaderId ID of the leader (null if copier)
   * @param copierId ID of the copier (null if leader)
   */
  private async syncUserHistoricalTransactions(
    walletAddress: string,
    leaderId: string | null,
    copierId: string | null,
  ): Promise<void> {
    // Create a query runner for transaction management
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      this.logger.log(
        `Syncing historical transactions for ${leaderId ? 'leader' : 'copier'} with wallet ${walletAddress}`,
      );

      // Start transaction
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Get the latest transaction timestamp for this user (if any)
      let latestTransaction: { timestamp_ms: string } | null = null;

      if (leaderId) {
        latestTransaction = await queryRunner.manager.query(
          `
          SELECT MAX(timestamp_ms::bigint) as timestamp_ms 
          FROM transactions 
          WHERE leader_id = $1 AND timestamp_ms IS NOT NULL
        `,
          [leaderId],
        );
      } else if (copierId) {
        latestTransaction = await queryRunner.manager.query(
          `
          SELECT MAX(timestamp_ms::bigint) as timestamp_ms 
          FROM transactions 
          WHERE copier_id = $1 AND timestamp_ms IS NOT NULL
        `,
          [copierId],
        );
      }

      // Store the latest timestamp to skip newer orders
      let latestTimestamp: number | null = null;
      if (latestTransaction && latestTransaction[0] && latestTransaction[0].timestamp_ms) {
        latestTimestamp = parseInt(latestTransaction[0].timestamp_ms);
        this.logger.log(
          `Latest transaction timestamp for ${walletAddress}: ${new Date(latestTimestamp).toISOString()}`,
        );
      } else {
        this.logger.log(`No existing transactions found for ${walletAddress}, will sync all historical data`);
      }

      // Define time periods for fetching data (6 chunks of 2 months each = 1 year)
      const now = Date.now();
      const twoMonthsInMs = 2 * 30 * 24 * 60 * 60 * 1000; // Approximate 2 months in milliseconds

      // Create 6 time chunks going back 1 year
      const timeChunks = [];
      for (let i = 0; i < 6; i++) {
        const endTime = i === 0 ? now : timeChunks[i - 1].startTime;
        const startTime = endTime - twoMonthsInMs;
        timeChunks.push({ startTime, endTime });
      }

      this.logger.log(`Will fetch fills for ${timeChunks.length} time periods for ${walletAddress}`);

      // Process each time chunk
      let totalFills = 0;

      for (const { startTime, endTime } of timeChunks) {
        this.logger.log(
          `Fetching fills from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()} for ${walletAddress}`,
        );

        // Fetch fills from Hyperliquid API for this time chunk
        const fills = await this.hyperliquidService.getFillsByWalletAddress(walletAddress, startTime, endTime);
        totalFills += fills.length;

        this.logger.log(
          `Found ${fills.length} fills for period ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`,
        );

        // Process each fill in this chunk
        for (const fill of fills) {
          // Skip if not a perpetual order (leverage order)
          if (!this.isLeverageOrder(fill.dir)) {
            continue;
          }

          // Skip if this order is newer than the latest one we already have
          if (latestTimestamp && parseInt(fill.time) > latestTimestamp) {
            this.logger.debug(`Skipping order ${fill.hash} as it's newer than our latest transaction`);
            continue;
          }

          // Check if this transaction already exists in the database
          const existingTransaction = await queryRunner.manager.query(
            `
            SELECT id FROM transactions WHERE transaction_hash = $1
          `,
            [fill.hash],
          );

          if (existingTransaction && existingTransaction.length > 0) {
            this.logger.debug(`Transaction ${fill.hash} already exists in database, skipping`);
            continue;
          }

          // Get token information based on order type
          const direction = fill.side === 'B' ? TransactionDirection.BUY : TransactionDirection.SELL;
          const tokenInfo = this.isLeverageOrder(fill.dir)
            ? fill.coin
            : await this.hyperliquidService.getPairById(fill.coin);

          // Create transaction entity using the same approach as in LeaderConsumer
          const transaction = queryRunner.manager.create(TransactionEntity, {
            leaderId,
            copierId,
            chainId: CHAIN_ID.HYPER_LIQUID,
            base: this.isLeverageOrder(fill.dir) ? fill.coin : tokenInfo.baseToken.name,
            quote: this.isLeverageOrder(fill.dir) ? fill.feeToken || 'USD' : tokenInfo.quoteToken.name,
            amount: parseFloat(fill.sz),
            price: parseFloat(fill.px),
            totalValue: parseFloat(fill.sz) * parseFloat(fill.px),
            direction,
            closedPnl: fill.closedPnl ? parseFloat(fill.closedPnl) : null,
            status: TransactionStatus.COMPLETED,
            timestampMs: fill.time.toString(),
            transactionHash: fill.hash,
            type: this.isLeverageOrder(fill.dir) ? TransactionType.PREPETUALS : TransactionType.SPOT,
            metadata: JSON.stringify(fill),
            hyperliquidOrderId: fill.oid ? fill.oid.toString() : null,
          });

          // Save the transaction to the database using the transaction manager
          await queryRunner.manager.save(transaction);

          this.logger.debug(`Successfully processed historical transaction ${fill.hash} for ${walletAddress}`);
        }
      }

      this.logger.log(`Processed a total of ${totalFills} historical fills for ${walletAddress}`);

      // Mark the user as synced after processing all time chunks
      await this.markUserAsSyncedWithTransaction(queryRunner.manager, leaderId, copierId);

      // Commit the transaction if there are any pending changes
      await queryRunner.commitTransaction();

      this.logger.log(`Completed syncing historical transactions for ${walletAddress}`);
    } catch (error) {
      // Rollback transaction in case of error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(`Error syncing historical transactions for ${walletAddress}: ${error.message}`, error.stack);
    } finally {
      // Release the query runner regardless of success or failure
      await queryRunner.release();
    }
  }

  /**
   * Mark a user (leader or copier) as having their history synced within an existing transaction
   * @param manager EntityManager to use for the transaction
   * @param leaderId ID of the leader (null if copier)
   * @param copierId ID of the copier (null if leader)
   */
  private async markUserAsSyncedWithTransaction(
    manager: EntityManager,
    leaderId: string | null,
    copierId: string | null,
  ): Promise<void> {
    try {
      if (leaderId) {
        await manager.query(
          `
          UPDATE leaders SET history_synced = true WHERE id = $1
        `,
          [leaderId],
        );
        this.logger.log(`Marked leader ${leaderId} as history synced`);
      } else if (copierId) {
        await manager.query(
          `
          UPDATE copiers SET history_synced = true WHERE id = $1
        `,
          [copierId],
        );
        this.logger.log(`Marked copier ${copierId} as history synced`);
      }
    } catch (error) {
      this.logger.error(`Error marking user as synced within transaction: ${error.message}`, error.stack);
      throw error; // Re-throw to allow transaction handling in the calling method
    }
  }

  /**
   * Check if an order is a leverage order (perpetual)
   * @param dir Direction of the order
   * @returns True if it's a leverage order
   */
  private isLeverageOrder(dir: string): boolean {
    return !['Buy', 'Sell'].includes(dir);
  }
}
