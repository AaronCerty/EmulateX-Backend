import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [HealthCheckController],
  providers: [HealthCheckService],
})
export class HealthCheckModule {}
