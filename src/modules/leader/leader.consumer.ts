import { KafkaService } from '../kafka/kafka.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { EachMessagePayload } from 'kafkajs';
import { CHAIN_ID, COMMON_CONSTANT } from 'src/constants/common.constant';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import {
  TransactionDirection,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from 'src/entities/transaction.entity';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { sendTelegramMessage } from 'src/shared/utils/slack.util';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class LeaderConsumer implements OnModuleInit {
  private readonly logger = new Logger(LeaderConsumer.name);

  constructor(
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly kafkaService: KafkaService,
    private readonly hyperliquidService: HyperliquidService,
    private readonly configService: ApiConfigService,
  ) {}

  async onModuleInit() {
    if (!this.configService.isLeaderConsumerMode()) {
      this.logger.log('Not in consumer mode, skipping leader consumer initialization');
      return;
    }

    this.logger.log('Initializing leader order consumer');
    await this.initializeConsumer();
  }

  private async initializeConsumer() {
    try {
      await this.kafkaService.createConsumerProcessor(
        this.kafkaService['topics'].leaderOrderTopic,
        'leader-order-consumer-group',
        this.processLeaderOrderMessage.bind(this),
      );
      this.logger.log('Leader order consumer initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize leader order consumer: ${error.message}`, error.stack);
      // Schedule a retry after a delay instead of failing completely
      setTimeout(() => {
        this.logger.log('Retrying leader order consumer initialization...');
        this.initializeConsumer();
      }, 30000); // Retry after 30 seconds
    }
  }

  private async processLeaderOrderMessage(payload: EachMessagePayload) {
    const { message } = payload;
    const messageValue = message.value?.toString();

    if (!messageValue) {
      this.logger.warn('Received empty message, skipping');
      return;
    }

    const data = JSON.parse(messageValue);
    const { walletAddress, order } = data;

    this.logger.debug(`Processing order ${order.hash} for wallet ${walletAddress}`);

    // Start a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if the order already exists in the database
      const existingTransaction = await queryRunner.manager.findOne(TransactionEntity, {
        where: { transactionHash: order.hash },
      });

      if (existingTransaction) {
        this.logger.debug(`Order ${order.hash} already exists in database, skipping`);
        await queryRunner.commitTransaction();
        return;
      }

      // Find the leader by wallet address
      const leader = await queryRunner.query(
        `
          SELECT l.id as "leaderId"
          FROM leaders l
          INNER JOIN users u ON u.id = l."user_id"
          WHERE LOWER(u."wallet_address") = LOWER($1)
        `,
        [walletAddress],
      );

      if (!leader || leader.length === 0) {
        this.logger.warn(`Leader with wallet address ${walletAddress} not found, skipping`);
        await queryRunner.commitTransaction();
        return;
      }

      const leaderId = leader[0].leaderId;

      // Process the order
      const direction = order.side === 'B' ? TransactionDirection.BUY : TransactionDirection.SELL;
      const tokenInfo = this.isLeverageOrder(order.dir)
        ? order.coin
        : await this.hyperliquidService.getPairById(order.coin);

      // Create transaction entity for the leader
      const leaderTransaction = queryRunner.manager.create(TransactionEntity, {
        leaderId,
        chainId: CHAIN_ID.HYPER_LIQUID,
        base: this.isLeverageOrder(order.dir) ? order.coin : tokenInfo.baseToken.name,
        quote: this.isLeverageOrder(order.dir) ? order.feeToken : tokenInfo.quoteToken.name,
        amount: parseFloat(order.sz),
        price: parseFloat(order.px),
        totalValue: parseFloat(order.sz) * parseFloat(order.px),
        direction,
        closedPnl: order.closedPnl,
        status: TransactionStatus.COMPLETED,
        timestampMs: order.time,
        transactionHash: order.hash,
        type: this.isLeverageOrder(order.dir) ? TransactionType.PREPETUALS : TransactionType.SPOT,
        metadata: JSON.stringify(order),
        hyperliquidOrderId: order.oid ? order.oid.toString() : null,
      });

      // Save the leader transaction
      await queryRunner.manager.save(leaderTransaction);

      await this.executeCopyTradeProcess(queryRunner, leaderId, leaderTransaction);

      await queryRunner.commitTransaction();
      this.logger.log(`Successfully processed order ${order.hash} for leader ${leaderId} and initiated copy trades`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error processing order ${order?.hash}: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private isLeverageOrder(dir: string) {
    return !['Buy', 'Sell'].includes(dir);
  }

  async executeCopyTradeProcess(queryRunner: QueryRunner, leaderId: string, leaderTransaction: TransactionEntity) {
    // not copytrade if order is more than 15 minute age
    if (Number(leaderTransaction.timestampMs) < Date.now() - 15 * 60 * 1000) {
      this.logger.log(`Order ${leaderTransaction.transactionHash} is more than 15 minutes old, skipping copy trade`);
      return;
    }

    // Find all copiers following this leader
    let copyTradeSessions = await queryRunner.manager.find(CopyTradeSessionEntity, {
      where: { leaderId, isActive: true },
    });

    copyTradeSessions = copyTradeSessions.filter((copierFollowLeader) => {
      return copierFollowLeader.startCopyTradeAt.getTime() < Number(leaderTransaction.timestampMs);
    });

    this.logger.debug(`Found ${copyTradeSessions.length} copiers following leader ${leaderId}`);

    // Process copy trades for each copier
    for (const copyTradeSession of copyTradeSessions) {
      // Get copier details including fund wallet private key
      const copier = await queryRunner.manager.findOne(CopierEntity, {
        where: { id: copyTradeSession.copierId },
      });

      if (!copier || !copier.fundWalletPrivateKey) {
        this.logger.warn(`Copier ${copyTradeSession.copierId} has no fund wallet, skipping`);
        continue;
      }

      // execute copy-trade order
      sendTelegramMessage(`Executing copy-trade order for copier ${copyTradeSession.copierId}`);
      const orderData = await this.hyperliquidService.executeOrder(
        copier.fundWalletAddress,
        copier.fundWalletPrivateKey,
        leaderTransaction,
        copyTradeSession.scaleFactor,
        copyTradeSession.slippage,
        copyTradeSession.fixedAmountPerTrade,
      );
      sendTelegramMessage(
        `Copy-trade order executed for copier ${copyTradeSession.copierId}, orderId: ${orderData.orderId}`,
      );

      // Create a transaction entity instance for the copier
      const copierTransaction = queryRunner.manager.create(TransactionEntity, {
        copierId: copier.id,
        chainId: CHAIN_ID.HYPER_LIQUID,
        base: leaderTransaction.base,
        quote: leaderTransaction.quote,
        direction: leaderTransaction.direction,
        status: orderData.errorMessage ? TransactionStatus.FAILED : TransactionStatus.PENDING,
        type: leaderTransaction.type,
        copyFromTransaction: leaderTransaction.id,
        transactionHash: orderData.orderId || `copy-${leaderTransaction.transactionHash}`,
        errorMessage: orderData.errorMessage,
        hyperliquidOrderId: orderData.orderId,
      });

      await queryRunner.manager.save(copierTransaction);
    }
  }
}
