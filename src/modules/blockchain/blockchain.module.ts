import { BlockchainInteractService } from './blockchain-interact.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [BlockchainInteractService],
  exports: [BlockchainInteractService],
})
export class BlockchainModule {}
