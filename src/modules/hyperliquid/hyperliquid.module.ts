import { HyperliquidService } from './hyperliquid.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { LeaderEntity } from 'src/entities/leader.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { KafkaModule } from 'src/modules/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderEntity, TransactionEntity], COMMON_CONSTANT.DATASOURCE.DEFAULT),
    KafkaModule,
  ],
  providers: [HyperliquidService],
  exports: [HyperliquidService],
})
export class HyperliquidModule {}
