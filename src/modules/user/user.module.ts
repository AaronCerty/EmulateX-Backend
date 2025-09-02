import { COMMON_CONSTANT } from '../../constants/common.constant';
import { UserEntity } from '../../entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceEntity } from 'src/entities/balance.entity';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';
import { DepositHistoryEntity } from 'src/entities/deposit-history.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import { WithdrawHistoryEntity } from 'src/entities/withdraw-history.entity';
import { BlockchainModule } from 'src/modules/blockchain/blockchain.module';
import { HyperliquidModule } from 'src/modules/hyperliquid/hyperliquid.module';
import { KafkaModule } from 'src/modules/kafka/kafka.module';
import { UserController } from 'src/modules/user/user.controller';
import { UserService } from 'src/modules/user/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        UserEntity,
        DepositHistoryEntity,
        WithdrawHistoryEntity,
        BalanceEntity,
        LeaderEntity,
        CopierEntity,
        CopyTradeSessionEntity,
      ],
      COMMON_CONSTANT.DATASOURCE.DEFAULT,
    ),
    HyperliquidModule,
    KafkaModule,
    BlockchainModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
