import { FundTransferConsumer } from './fund-transfer.consumer';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';
import { DepositHistoryEntity } from 'src/entities/deposit-history.entity';
import { FundTransferEntity } from 'src/entities/fund-transfer.entity';
import { HyperliquidDepositEntity } from 'src/entities/hyperliquid-deposit.entity';
import { LatestBlockEntity } from 'src/entities/latest-block.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import { LockAddressEntity } from 'src/entities/lock-address.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { UserEntity } from 'src/entities/user.entity';
import { WithdrawHistoryEntity } from 'src/entities/withdraw-history.entity';
import { BlockchainModule } from 'src/modules/blockchain/blockchain.module';
import { HyperliquidModule } from 'src/modules/hyperliquid/hyperliquid.module';
import { KafkaModule } from 'src/modules/kafka/kafka.module';

@Module({
  controllers: [],
  providers: [FundTransferConsumer],
  exports: [FundTransferConsumer],
  imports: [
    TypeOrmModule.forFeature(
      [
        LeaderEntity,
        TransactionEntity,
        LatestBlockEntity,
        BalanceEntity,
        UserEntity,
        DepositHistoryEntity,
        WithdrawHistoryEntity,
        FundTransferEntity,
        CopyTradeSessionEntity,
        CopierEntity,
        HyperliquidDepositEntity,
        LockAddressEntity,
      ],
      COMMON_CONSTANT.DATASOURCE.DEFAULT,
    ),
    ConfigModule,
    BlockchainModule,
    KafkaModule,
    HyperliquidModule,
  ],
})
export class FundTransferModule {}
