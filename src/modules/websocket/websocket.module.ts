import { CopierModule } from '../copier/copier.module';
import { HyperliquidModule } from '../hyperliquid/hyperliquid.module';
import { LeaderModule } from '../leader/leader.module';
import { PositionsGateway } from './positions.gateway';
import { PositionsService } from './positions.service';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { CopierEntity } from 'src/entities/copier.entity';
import { LeaderEntity } from 'src/entities/leader.entity';

let providers = [];
if (process.env.APP_MODE.split(',').includes('api') || process.env.APP_MODE.split(',').includes('full')) {
  providers.push(PositionsGateway, PositionsService);
}
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([LeaderEntity, CopierEntity], COMMON_CONSTANT.DATASOURCE.DEFAULT),
    LeaderModule,
    CopierModule,
    HyperliquidModule,
  ],
  providers,
  exports: providers,
})
export class WebsocketModule {}
