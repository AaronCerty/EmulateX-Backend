import { ApiProperty } from '@nestjs/swagger';
import { CopyTradeSessionEntity } from 'src/entities/copy-trade-session.entity';

export class GetCopyingLeadersResponseDto {
  @ApiProperty({ description: 'List of leader IDs that the copier is following', type: [String] })
  leaderIds: string[];

  @ApiProperty({ description: 'List of copy trade session that the copier is following', type: [String] })
  copyTradeSession: CopyTradeSessionEntity[];

  @ApiProperty({ description: 'List of copy trade session that the copier is following' })
  estimatePnLs: any[];
}
