import { KafkaModule } from '../kafka/kafka.module';
import { CopierConsumer } from './copier.consumer';
import { CopierController } from './copier.controller';
import { CopierService } from './copier.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { CopierEntity } from 'src/entities/copier.entity';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { HyperliquidModule } from 'src/modules/hyperliquid/hyperliquid.module';

@Module({
  imports: [
    KafkaModule,
    HyperliquidModule,
    TypeOrmModule.forFeature(
      [CopierEntity, TransactionEntity, CopyTradeSessionEntity],
      COMMON_CONSTANT.DATASOURCE.DEFAULT,
    ),
  ],
  controllers: [CopierController],
  providers: [CopierConsumer, CopierService],
  exports: [CopierConsumer, CopierService],
})
export class CopierModule {}
