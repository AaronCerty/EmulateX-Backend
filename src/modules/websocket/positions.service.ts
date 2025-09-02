import { CopierService } from '../copier/copier.service';
import { LeaderService } from '../leader/leader.service';
import { PositionsGateway } from './positions.gateway';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { CopierEntity } from 'src/entities/copier.entity';
import { LeaderEntity } from 'src/entities/leader.entity';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { Repository } from 'typeorm';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(
    private readonly leaderService: LeaderService,
    private readonly copierService: CopierService,
    private readonly positionsGateway: PositionsGateway,
    @InjectRepository(LeaderEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly leaderRepository: Repository<LeaderEntity>,
    @InjectRepository(CopierEntity, COMMON_CONSTANT.DATASOURCE.DEFAULT)
    private readonly copierRepository: Repository<CopierEntity>,
    private readonly configService: ApiConfigService,
  ) {}

  @Cron('*/5 * * * * *')
  async fetchAndBroadcastAllPositions() {
    if (!this.configService.isApiMode()) {
      return;
    }

    this.logger.log('Fetching all positions for WebSocket broadcast');

    try {
      // Fetch and broadcast leader positions
      await this.fetchAndBroadcastLeaderPositions();

      // Fetch and broadcast copier positions
      await this.fetchAndBroadcastCopierPositions();

      this.logger.log('Successfully broadcasted all positions');
    } catch (error) {
      this.logger.error(`Error in positions broadcast job: ${error.message}`);
    }
  }

  /**
   * Fetch and broadcast all leader positions
   */
  private async fetchAndBroadcastLeaderPositions() {
    this.logger.log('Fetching all leader positions');

    try {
      // Get all leaders
      const leaders = await this.leaderRepository.find();

      // Fetch positions for each leader
      const leaderPositions = [];
      for (const leader of leaders) {
        try {
          const positions = await this.leaderService.getLeaderPositions(leader.id);
          leaderPositions.push({
            leaderId: leader.id,
            positions,
          });
        } catch (error) {
          this.logger.error(`Error fetching positions for leader ${leader.id}: ${error.message}`);
        }
      }

      // Broadcast all leader positions
      this.positionsGateway.broadcastLeaderPositions(leaderPositions);
      this.logger.log(`Successfully broadcasted positions for ${leaderPositions.length} leaders`);
    } catch (error) {
      this.logger.error(`Error in leader positions broadcast: ${error.message}`);
    }
  }

  /**
   * Fetch and broadcast all copier positions
   */
  private async fetchAndBroadcastCopierPositions() {
    this.logger.log('Fetching all copier positions');

    try {
      // Get all copiers
      const copiers = await this.copierRepository.find();

      // Fetch positions for each copier
      const copierPositions = [];
      for (const copier of copiers) {
        try {
          const positions = await this.copierService.getCopierPositions(copier.id);
          copierPositions.push({
            copierId: copier.id,
            positions,
          });
        } catch (error) {
          this.logger.error(`Error fetching positions for copier ${copier.id}: ${error.message}`);
        }
      }

      // Broadcast all copier positions
      this.positionsGateway.broadcastCopierPositions(copierPositions);
      this.logger.log(`Successfully broadcasted positions for ${copierPositions.length} copiers`);
    } catch (error) {
      this.logger.error(`Error in copier positions broadcast: ${error.message}`);
    }
  }
}
