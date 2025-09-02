import { LeaderType, RiskLevel } from '../../../constants/leader.constant';
import { ApiProperty } from '@nestjs/swagger';

export class LeaderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ nullable: true })
  name: string;

  @ApiProperty({ nullable: true })
  avt: string;

  @ApiProperty({ nullable: true })
  imageUrl: string;

  @ApiProperty({ nullable: true })
  description: string;

  @ApiProperty({ nullable: true })
  telegramUrl: string;

  @ApiProperty({ nullable: true })
  xUrl: string;

  @ApiProperty({ enum: RiskLevel, nullable: true })
  riskLevel: RiskLevel;

  @ApiProperty({ enum: LeaderType })
  leaderType: LeaderType;

  @ApiProperty({ nullable: true })
  startTradeTime: Date;

  // Copiers count
  @ApiProperty()
  followersCount: number;

  // AUM (Assets Under Management) fields
  @ApiProperty({ nullable: true })
  aum1d: number;

  @ApiProperty({ nullable: true })
  aum7d: number;

  @ApiProperty({ nullable: true })
  aum30d: number;

  // PNL fields
  @ApiProperty({ nullable: true })
  pnl1d: number;

  @ApiProperty({ nullable: true })
  pnl7d: number;

  @ApiProperty({ nullable: true })
  pnl30d: number;

  // ROI fields
  @ApiProperty({ nullable: true })
  roi1d: number;

  @ApiProperty({ nullable: true })
  roi7d: number;

  @ApiProperty({ nullable: true })
  roi30d: number;

  // Win rate fields
  @ApiProperty({ nullable: true })
  winRate1d: number;

  @ApiProperty({ nullable: true })
  winRate7d: number;

  @ApiProperty({ nullable: true })
  winRate30d: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class GetLeadersResponseDto {
  @ApiProperty({ type: [LeaderDto] })
  items: LeaderDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
