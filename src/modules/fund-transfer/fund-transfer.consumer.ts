import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { EachMessagePayload } from 'kafkajs';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { ERROR } from 'src/constants/exception.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { DepositHistoryEntity, DepositHistoryStatus } from 'src/entities/deposit-history.entity';
import { HyperliquidDepositEntity, HyperliquidDepositStatus } from 'src/entities/hyperliquid-deposit.entity';
import { LockAddressEntity, LockAddressStatus } from 'src/entities/lock-address.entity';
import { UserEntity } from 'src/entities/user.entity';
import { WithdrawHistoryEntity, WithdrawHistoryStatus } from 'src/entities/withdraw-history.entity';
import { BlockchainInteractService } from 'src/modules/blockchain/blockchain-interact.service';
import { HyperliquidService } from 'src/modules/hyperliquid/hyperliquid.service';
import { KafkaService } from 'src/modules/kafka/kafka.service';
import { BaseException } from 'src/shared/filters/exception.filter';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { sendTelegramMessage } from 'src/shared/utils/slack.util';
import { sleep } from 'src/shared/utils/sleep';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class FundTransferConsumer implements OnModuleInit {
  private readonly logger = new Logger(FundTransferConsumer.name);

  constructor(
    private readonly configService: ApiConfigService,
    @InjectRepository(UserEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(BalanceEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly balanceRepository: Repository<BalanceEntity>,
    @InjectRepository(DepositHistoryEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly depositHistoryRepository: Repository<DepositHistoryEntity>,
    @InjectRepository(HyperliquidDepositEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly hyperliquidDepositRepository: Repository<HyperliquidDepositEntity>,
    @InjectDataSource(COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly dataSource: DataSource,
    private readonly blockchainInteractService: BlockchainInteractService,
    private readonly kafkaService: KafkaService,
    private readonly hyperliquidService: HyperliquidService,
  ) {}

  async onModuleInit() {
    if (!this.configService.isFundingConsumerMode()) {
      this.logger.log('Not in funding consumer mode, skipping copier consumer initialization');
      return;
    }

    await this.initializeConsumer();
  }

  private async initializeConsumer() {
    try {
      this.logger.log('Initializing funding consumer');

      await this.kafkaService.createConsumerProcessor(
        this.kafkaService.topics.depositToHyperliquid,
        `deposit-to-hyperliquid-consumer-group`,
        this.consumerDepositToHyperliquid.bind(this),
      );

      await this.kafkaService.createConsumerProcessor(
        this.kafkaService.topics.requestWithdraw,
        `request-withdraw-consumer-group`,
        this.consumerRequestWithdraw.bind(this),
      );

      await this.kafkaService.createConsumerProcessor(
        this.kafkaService.topics.verifyDepositedOnHyperliquid,
        `verify-deposited-on-hyperliquid-consumer-group`,
        this.consumerVerifyDepositedOnHyperliquid.bind(this),
      );

      this.logger.log('Funding consumer initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing funding consumer: ${error.message}`, error.stack);
      // Retry initialization after a delay
      setTimeout(() => this.initializeConsumer(), 10000);
    }
  }

  async consumerDepositToHyperliquid(payload: EachMessagePayload) {
    const { message } = payload;
    const messageValue = message.value?.toString();
    const messageKey = message.key?.toString();

    if (!messageValue || !messageKey) {
      this.logger.warn('Received empty message, skipping');
      return;
    }

    const data = JSON.parse(messageValue);

    const txHash = data.depositTransactionHash;

    const depositHistory = await this.depositHistoryRepository.findOne({
      where: {
        txHash: txHash,
      },
    });

    if (!depositHistory) {
      throw new Error(`Deposit history not found for txHash ${txHash}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const user = await queryRunner.manager.findOne(UserEntity, {
      where: {
        walletAddress: depositHistory.walletAddress,
      },
    });

    const balance = await queryRunner.manager.findOne(BalanceEntity, {
      where: {
        userId: user.id,
      },
    });

    let hyperliquidDepositTxHash;

    try {
      const lockAddress = await queryRunner.manager.findOne(LockAddressEntity, {
        where: {
          address: this.blockchainInteractService.getAdminWalletAddress(),
        },
      });

      if (lockAddress && lockAddress.status === LockAddressStatus.UNAVAILABLE)
        throw new BaseException(ERROR.LOCK_ADDRESS_ADMIN_IS_UNAVAILABLE, 400);

      lockAddress.status = LockAddressStatus.UNAVAILABLE;
      await queryRunner.manager.save(LockAddressEntity, lockAddress);

      const receipt = await this.blockchainInteractService.depositToHyperLiquidWithPermit(
        balance.balanceWalletAddress,
        balance.balanceWalletPrivateKey,
        depositHistory.amount,
        user.walletAddress,
      );

      hyperliquidDepositTxHash = receipt.transactionHash;

      const hyperliquidDepositEntity = new HyperliquidDepositEntity();
      hyperliquidDepositEntity.amount = depositHistory.amount;
      hyperliquidDepositEntity.txHash = receipt.transactionHash;
      hyperliquidDepositEntity.status = HyperliquidDepositStatus.PENDING;
      hyperliquidDepositEntity.userWalletAddress = user.walletAddress;
      hyperliquidDepositEntity.depositHistoryId = depositHistory.id;
      hyperliquidDepositEntity.createdAt = new Date();
      hyperliquidDepositEntity.updatedAt = new Date();

      depositHistory.status = DepositHistoryStatus.DEPOSITED_HYPERLIQUID;

      await queryRunner.manager.save(HyperliquidDepositEntity, hyperliquidDepositEntity);
      await queryRunner.manager.save(DepositHistoryEntity, depositHistory);

      lockAddress.status = LockAddressStatus.AVAILABLE;
      await queryRunner.manager.save(LockAddressEntity, lockAddress);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      this.logger.error(`Failed to deposit to hyperliquid: Deposit TxHash ${txHash}`);
      this.logger.error(error);
      this.logger.error(error.stack);

      await sendTelegramMessage(`Failed to deposit to hyperliquid: Deposit TxHash ${txHash} @thomas8198
        Error: ${error.message}
        `);

      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw error;
    }

    await this.kafkaService.sendMessage(this.kafkaService.topics.verifyDepositedOnHyperliquid, {
      hyperliquidDepositTxHash: hyperliquidDepositTxHash,
    });
  }

  async consumerVerifyDepositedOnHyperliquid(payload: EachMessagePayload) {
    const { message } = payload;
    const messageValue = message.value?.toString();
    const messageKey = message.key?.toString();

    if (!messageValue || !messageKey) {
      this.logger.warn('Received empty message, skipping');
      return;
    }

    const data = JSON.parse(messageValue);

    const hyperliquidDepositTxHash = data.hyperliquidDepositTxHash;

    // TODO: confirm hyperliquid deposit is arrived and able to start copy trade session
    while (true) {
      const hyperliquidDepositEntity = await this.hyperliquidDepositRepository.findOne({
        where: {
          txHash: hyperliquidDepositTxHash,
        },
      });

      if (hyperliquidDepositEntity.status == HyperliquidDepositStatus.COMPLETED) return;

      const user = await this.userRepository.findOne({
        where: {
          walletAddress: hyperliquidDepositEntity.userWalletAddress,
        },
      });

      const balance = await this.balanceRepository.findOne({
        where: {
          userId: user.id,
        },
      });

      const hyperliquidDepositHistory = await this.hyperliquidService.getHistoryByUserAddress(
        balance.balanceWalletAddress,
        new Date().getTime() - 60 * 60 * 1000 * 24,
        new Date().getTime(),
      );

      this.logger.log(hyperliquidDepositEntity);
      this.logger.log(hyperliquidDepositHistory);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (hyperliquidDepositHistory.map((e) => e.hash).includes(hyperliquidDepositEntity.txHash)) {
          await queryRunner.manager.update(
            HyperliquidDepositEntity,
            { id: hyperliquidDepositEntity.id },
            { status: HyperliquidDepositStatus.COMPLETED },
          );
          await queryRunner.manager.update(
            DepositHistoryEntity,
            { id: hyperliquidDepositEntity.depositHistoryId },
            { status: DepositHistoryStatus.DONE },
          );

          await queryRunner.manager.query(`
              UPDATE balance
              SET available_balance = available_balance + ${hyperliquidDepositEntity.amount}
              WHERE user_id = '${user.id}'
            `);

          await queryRunner.commitTransaction();
          await queryRunner.release();
          return;
        }
      } catch (error) {
        this.logger.error(`Failed to update hyperliquid deposit status`);
        this.logger.error(error);
        this.logger.error(error.stack);

        await sendTelegramMessage(`Failed to update hyperliquid deposit status @thomas8198
          Hyperliquid Deposit TxHash: ${hyperliquidDepositEntity.txHash}
          Error: ${error.message}
          `);

        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        throw error;
      }

      await sleep(5000);
    }
  }

  async consumerRequestWithdraw(payload: EachMessagePayload) {
    const { message } = payload;
    const messageValue = message.value?.toString();
    const messageKey = message.key?.toString();

    if (!messageValue || !messageKey) {
      this.logger.warn('Received empty message, skipping');
      return;
    }

    const data = JSON.parse(messageValue);

    this.logger.debug(`Processing withdraw request`);
    this.logger.debug(data);

    const requestWithdrawId = data.requestWithdrawId;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawHistory = await queryRunner.manager.findOne(WithdrawHistoryEntity, {
        where: {
          id: requestWithdrawId,
        },
      });

      const balance = await queryRunner.manager.findOne(BalanceEntity, {
        where: {
          userId: withdrawHistory.userId,
        },
      });

      this.logger.debug(`withdrawHistory id`);
      this.logger.debug(withdrawHistory.id);

      this.logger.debug(`balance id`);
      this.logger.debug(balance.id);

      this.logger.debug(`user id`);
      this.logger.debug(withdrawHistory.userId);

      const result = await this.hyperliquidService.withdrawUSDCFromPerpToArbitrum(
        balance.balanceWalletAddress,
        balance.balanceWalletPrivateKey,
        this.blockchainInteractService.getCopyTradingContractAddress(),
        withdrawHistory.amount,
        withdrawHistory.nonce,
      );

      withdrawHistory.status = WithdrawHistoryStatus.PENDING_BLOCKCHAIN;

      await queryRunner.manager.save(WithdrawHistoryEntity, withdrawHistory);

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await sendTelegramMessage(`Fail to withdraw: Withdraw request id: ${requestWithdrawId} @thomas8198
        Error: ${error.message}
        `);
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.logger.error(error.message);
      throw error;
    }
  }
}
