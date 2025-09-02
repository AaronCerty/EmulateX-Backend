import { KafkaService } from './kafka.service';
import { Module } from '@nestjs/common';

@Module({
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
