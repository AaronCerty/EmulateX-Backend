import { COMMON_CONSTANT } from '../../constants/common.constant';
import { LeaderEntity } from '../../entities/leader.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import { UserStatisticCrawlerService } from './user-statistic.crawler.service';
import { UserTransactionCrawlerService } from './user-transactions.crawler.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { DepositHistoryEntity } from 'src/entities/deposit-history.entity';
import { HyperliquidWithdrawEntity } from 'src/entities/hyperliquid-withdraw.entity';
import { LatestBlockEntity } from 'src/entities/latest-block.entity';
import { UserEntity } from 'src/entities/user.entity';
import { WithdrawHistoryEntity } from 'src/entities/withdraw-history.entity';
import { BlockchainModule } from 'src/modules/blockchain/blockchain.module';
import { BlockchainCrawlerService } from 'src/modules/crawler/blockchain.crawler.service';
import { HyperliquidModule } from 'src/modules/hyperliquid/hyperliquid.module';
import { KafkaModule } from 'src/modules/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        LeaderEntity,
        CopierEntity,
        TransactionEntity,
        LatestBlockEntity,
        BalanceEntity,
        UserEntity,
        DepositHistoryEntity,
        WithdrawHistoryEntity,
        HyperliquidWithdrawEntity,
      ],
      COMMON_CONSTANT.DATASOURCE.DEFAULT,
    ),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule,
    HyperliquidModule,
    KafkaModule,
    BlockchainModule,
  ],
  providers: [UserTransactionCrawlerService, BlockchainCrawlerService, UserStatisticCrawlerService],
  exports: [UserTransactionCrawlerService, BlockchainCrawlerService, UserStatisticCrawlerService],
})
export class CrawlerModule {}
