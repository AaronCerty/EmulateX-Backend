import { KafkaService } from '../kafka/kafka.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EachMessagePayload } from 'kafkajs';
import { CHAIN_ID, COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity, CopyTradeSessionStatus } from 'src/entities/copy-trade-session.entity';
import {
  TransactionDirection,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from 'src/entities/transaction.entity';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { BaseException } from 'src/shared/filters/exception.filter';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class CopierConsumer implements OnModuleInit {
  private readonly logger = new Logger(CopierConsumer.name);

  constructor(
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService,
    private readonly configService: ApiConfigService,
    private readonly hyperliquidService: HyperliquidService,
    @InjectRepository(CopyTradeSessionEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copyTradeSessionRepository: Repository<CopyTradeSessionEntity>,
    @InjectRepository(CopierEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copierRepository: Repository<CopierEntity>,
  ) {}

  async onModuleInit() {
    if (!this.configService.isCopierConsumerMode()) {
      this.logger.log('Not in consumer mode, skipping copier consumer initialization');
      return;
    }

    await this.initializeConsumer();
  }

  private async initializeConsumer() {
    try {
      this.logger.log('Initializing copier order consumer');

      await this.kafkaService.createConsumerProcessor(
        this.kafkaService.topics.copierOrderTopic,
        'copier-order-consumer-group',
        this.processCopierOrderMessage.bind(this),
      );

      this.logger.log('Copier order consumer initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing copier order consumer: ${error.message}`, error.stack);
      // Retry initialization after a delay
      setTimeout(() => this.initializeConsumer(), 10000);
    }
  }

  private async processCopierOrderMessage(payload: EachMessagePayload) {
    try {
      const { message } = payload;
      const messageValue = message.value?.toString();

      if (!messageValue) {
        this.logger.warn('Received empty message, skipping');
        return;
      }

      const data = JSON.parse(messageValue);
      const { walletAddress, order } = data;

      this.logger.debug(`Processing copier order ${order.hash} for wallet ${walletAddress}`);

      // Start a transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Find the copier by wallet address
        const copier = await queryRunner.query(
          `
          SELECT c.id as "copierId"
          FROM copiers c
          WHERE LOWER(c."fund_wallet_address") = LOWER($1)
        `,
          [walletAddress],
        );

        if (!copier || copier.length === 0) {
          this.logger.warn(`Copier with wallet address ${walletAddress} not found, skipping`);
          await queryRunner.commitTransaction();
          return;
        }

        const copierId = copier[0].copierId;

        // Check if a transaction with this hyperliquid_order_id already exists
        // We use the oid from the order as the hyperliquid_order_id
        const hyperliquidOrderId = order.oid ? order.oid.toString() : null;

        if (!hyperliquidOrderId) {
          this.logger.warn(`Order ${order.hash} has no order ID, skipping`);
          await queryRunner.commitTransaction();
          return;
        }

        // Look for existing transaction with this hyperliquid_order_id
        const existingTransaction = await queryRunner.manager.findOne(TransactionEntity, {
          where: { hyperliquidOrderId },
        });

        // Process the order
        const direction = order.side === 'B' ? TransactionDirection.BUY : TransactionDirection.SELL;
        const status = TransactionStatus.COMPLETED; // WebSocket fills are always completed

        if (existingTransaction) {
          // Update existing transaction
          this.logger.debug(`Updating existing transaction with hyperliquid_order_id ${hyperliquidOrderId}`);

          // Update the transaction fields
          existingTransaction.base = order.coin;
          existingTransaction.quote = order.feeToken;
          existingTransaction.amount = parseFloat(order.sz);
          existingTransaction.price = parseFloat(order.px);
          existingTransaction.totalValue = parseFloat(order.sz) * parseFloat(order.px);
          existingTransaction.direction = direction;
          existingTransaction.status = status;
          existingTransaction.timestampMs = order.time.toString();
          existingTransaction.transactionHash = order.hash;
          existingTransaction.type = this.isLeverageOrder(order.dir)
            ? TransactionType.PREPETUALS
            : TransactionType.SPOT;
          existingTransaction.metadata = JSON.stringify(order);
          existingTransaction.closedPnl = order.closedPnl ? parseFloat(order.closedPnl) : null;

          // Save the updated transaction
          await queryRunner.manager.update(TransactionEntity, existingTransaction.id, existingTransaction);
          this.logger.log(
            `Successfully updated transaction with hyperliquid_order_id ${hyperliquidOrderId} for copier ${copierId}`,
          );
        } else {
          // Create a new transaction
          this.logger.debug(`Creating new transaction with hyperliquid_order_id ${hyperliquidOrderId}`);

          // Create transaction entity for the copier
          const copierTransaction = queryRunner.manager.create(TransactionEntity, {
            copierId,
            chainId: CHAIN_ID.HYPER_LIQUID,
            base: order.coin,
            quote: order.feeToken,
            amount: parseFloat(order.sz),
            price: parseFloat(order.px),
            totalValue: parseFloat(order.sz) * parseFloat(order.px),
            direction,
            status,
            timestampMs: order.time.toString(),
            transactionHash: order.hash,
            type: this.isLeverageOrder(order.dir) ? TransactionType.PREPETUALS : TransactionType.SPOT,
            metadata: JSON.stringify(order),
            hyperliquidOrderId,
            closedPnl: order.closedPnl ? parseFloat(order.closedPnl) : null,
          });

          // Save the new transaction
          await queryRunner.manager.save(copierTransaction);
          this.logger.log(
            `Successfully created new transaction with hyperliquid_order_id ${hyperliquidOrderId} for copier ${copierId}`,
          );
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Error processing copier order ${order?.hash}: ${error.message}`, error.stack);
        throw error; // Re-throw to trigger consumer group rebalancing if needed
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger consumer group rebalancing if needed
    }
  }

  private isLeverageOrder(dir?: string): boolean {
    if (!dir) return false;
    return !['Buy', 'Sell'].includes(dir);
  }

  // @Cron(CronExpression.EVERY_MINUTE)
  async checkStopLossAllCopyTradeSession() {
    if (!this.configService.isCrawlerMode()) {
      return;
    }

    this.logger.debug(`Start check stop loss for all copy trade sessions running`);

    const copyTradeSession = await this.copyTradeSessionRepository.find({
      where: {
        status: CopyTradeSessionStatus.RUNNING,
        isActive: true,
      },
    });

    this.logger.debug(`Found ${copyTradeSession.length} copy trade sessions running. Check for stop loss session`);

    for (const session of copyTradeSession) {
      // check assests on hyperliquid is loss more than trigger
      const copier = await this.copierRepository.findOne({
        where: {
          id: session.copierId,
        },
      });

      const isTriggerStop = await this.hyperliquidService.checkStopLoss(
        session.amount,
        session.stopLossTriggerPercentage,
        copier.fundWalletAddress,
        copier.fundWalletPrivateKey,
      );

      // if true, cancel all orders and position
      if (isTriggerStop) {
        this.logger.log(`Trigger stop loss for session ${session.id}`);
        const queryRunner = await this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const copier = await queryRunner.manager.findOne(CopierEntity, {
            where: {
              id: session.copierId,
            },
          });

          await this.hyperliquidService.stopAllOpenOrders(copier.fundWalletAddress, copier.fundWalletPrivateKey);
          await this.hyperliquidService.stopAllOpenPositions(copier.fundWalletAddress, copier.fundWalletPrivateKey);

          // transfer all USDC from fund wallet to balance wallet
          const fundWalletPerpBalance = await this.hyperliquidService.getPerpBalanceOfWalletAddress(
            copier.fundWalletAddress,
          );
          const balance = await queryRunner.manager.findOne(BalanceEntity, {
            where: {
              userId: copier.userId,
            },
          });
          if (!balance) throw new BaseException(ERROR.BALANCE_NOT_FOUND, 400);

          await this.hyperliquidService.transferFromTo(
            copier.fundWalletAddress,
            copier.fundWalletPrivateKey,
            balance.balanceWalletAddress,
            fundWalletPerpBalance,
          );

          session.status = CopyTradeSessionStatus.COMPLETED;
          session.isActive = false;
          session.amountAfterStop = fundWalletPerpBalance;

          await queryRunner.manager.save(copyTradeSession);

          await queryRunner.manager.query(`
              UPDATE balance
              SET available_balance = available_balance + ${fundWalletPerpBalance}
              WHERE id = '${balance.id}'
          `);
          await queryRunner.commitTransaction();
          await queryRunner.release();
        } catch (error) {
          this.logger.error(`Error while stop loss session id ${session.id}`);
          await queryRunner.rollbackTransaction();
          await queryRunner.release();
        }
      }
    }

    this.logger.debug(`End check stop loss for all copy trade sessions running`);
  }
}
