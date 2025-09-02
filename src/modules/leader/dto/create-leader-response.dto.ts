import { LeaderType, RiskLevel } from '../../../constants/leader.constant';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaderResponseDto {
  @ApiProperty({ description: 'Leader ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Wallet address' })
  walletAddress: string;

  @ApiProperty({ description: 'Leader name' })
  name: string;

  @ApiProperty({ description: 'Avatar URL', required: false })
  avt?: string;

  @ApiProperty({ description: 'Image URL', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Leader description', required: false })
  description?: string;

  @ApiProperty({ description: 'Telegram URL', required: false })
  telegramUrl?: string;

  @ApiProperty({ description: 'X/Twitter URL', required: false })
  xUrl?: string;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel, required: false })
  riskLevel?: RiskLevel;

  @ApiProperty({ description: 'Leader type', enum: LeaderType })
  leaderType: LeaderType;

  @ApiProperty({ description: 'Start trade time', required: false })
  startTradeTime?: Date;

  @ApiProperty({ description: 'History synced flag' })
  historySynced: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;
}
