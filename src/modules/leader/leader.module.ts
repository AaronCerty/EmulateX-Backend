import { COMMON_CONSTANT } from '../../constants/common.constant';
import { LeaderEntity } from '../../entities/leader.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import { LeaderChartService } from './leader-chart.service';
import { LeaderController } from './leader.controller';
import { LeaderService } from './leader.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';
import { HyperliquidModule } from 'src/modules/hyperliquid/hyperliquid.module';
import { KafkaModule } from 'src/modules/kafka/kafka.module';
import { LeaderConsumer } from 'src/modules/leader/leader.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [LeaderEntity, TransactionEntity, CopyTradeSessionEntity, CopierEntity],
      COMMON_CONSTANT.DATASOURCE.DEFAULT,
    ),
    HyperliquidModule,
    KafkaModule,
  ],
  controllers: [LeaderController],
  providers: [LeaderService, LeaderConsumer, LeaderChartService],
  exports: [LeaderService],
})
export class LeaderModule {}
