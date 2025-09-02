import { LeaderType, RiskLevel } from '../../../constants/leader.constant';
import { ApiProperty } from '@nestjs/swagger';

export class GetLeaderDetailResponseDto {
  @ApiProperty({
    description: 'The ID of the leader',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id: string;

  @ApiProperty({
    description: 'The user ID of the leader',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  userId: string;

  @ApiProperty({
    description: 'The name of the leader',
    example: 'Crypto Wizard',
  })
  name: string;

  @ApiProperty({
    description: 'The avatar of the leader',
    example: 'avatar.jpg',
  })
  avt: string;

  @ApiProperty({
    description: 'The image URL of the leader',
    example: 'https://example.com/image.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'The description of the leader',
    example: 'Professional trader with 5 years of experience in crypto markets',
  })
  description: string;

  @ApiProperty({
    description: 'The Telegram URL of the leader',
    example: 'https://t.me/cryptowizard',
  })
  telegramUrl: string;

  @ApiProperty({
    description: 'The X (Twitter) URL of the leader',
    example: 'https://x.com/cryptowizard',
  })
  xUrl: string;

  @ApiProperty({
    description: 'The risk level of the leader',
    enum: RiskLevel,
    example: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel;

  @ApiProperty({
    description: 'The type of leader',
    enum: LeaderType,
    example: LeaderType.TRADER,
  })
  leaderType: LeaderType;

  @ApiProperty({
    description: 'The time when the leader started trading',
    example: '2023-01-01T00:00:00Z',
  })
  startTradeTime: Date;

  @ApiProperty({
    description: 'PnL for the last 7 days',
    example: 1500.5,
  })
  pnl7d: number;

  @ApiProperty({
    description: 'PnL for the last 30 days',
    example: 5200.75,
  })
  pnl30d: number;

  @ApiProperty({
    description: 'PnL for the last 90 days',
    example: 15000.25,
  })
  pnl90d: number;

  @ApiProperty({
    description: 'PnL for the last 180 days',
    example: 32000.8,
  })
  pnl180d: number;

  @ApiProperty({
    description: 'ROI for the last 7 days',
    example: 12.5,
  })
  roi7d: number;

  @ApiProperty({
    description: 'ROI for the last 30 days',
    example: 35.2,
  })
  roi30d: number;

  @ApiProperty({
    description: 'ROI for the last 90 days',
    example: 85.7,
  })
  roi90d: number;

  @ApiProperty({
    description: 'ROI for the last 180 days',
    example: 150.3,
  })
  roi180d: number;

  @ApiProperty({
    description: 'APY for the last 7 days',
    example: 65.5,
  })
  apy7d: number;

  @ApiProperty({
    description: 'APY for the last 30 days',
    example: 125.2,
  })
  apy30d: number;

  @ApiProperty({
    description: 'APY for the last 90 days',
    example: 95.7,
  })
  apy90d: number;

  @ApiProperty({
    description: 'APY for the last 180 days',
    example: 85.3,
  })
  apy180d: number;

  @ApiProperty({
    description: 'Win rate for the last 7 days',
    example: 75.5,
  })
  winRate7d: number;

  @ApiProperty({
    description: 'Win rate for the last 30 days',
    example: 68.2,
  })
  winRate30d: number;

  @ApiProperty({
    description: 'Win rate for the last 90 days',
    example: 72.7,
  })
  winRate90d: number;

  @ApiProperty({
    description: 'Win rate for the last 180 days',
    example: 70.3,
  })
  winRate180d: number;

  @ApiProperty({
    description: 'Sharpe ratio for the last 7 days',
    example: 2.1,
  })
  sharpeRatio7d: number;

  @ApiProperty({
    description: 'Sharpe ratio for the last 30 days',
    example: 1.8,
  })
  sharpeRatio30d: number;

  @ApiProperty({
    description: 'Sharpe ratio for the last 90 days',
    example: 1.9,
  })
  sharpeRatio90d: number;

  @ApiProperty({
    description: 'Sharpe ratio for the last 180 days',
    example: 2.0,
  })
  sharpeRatio180d: number;

  @ApiProperty({
    description: 'Drawdown for the last 7 days',
    example: 8.5,
  })
  drawdown7d: number;

  @ApiProperty({
    description: 'Drawdown for the last 30 days',
    example: 12.2,
  })
  drawdown30d: number;

  @ApiProperty({
    description: 'Drawdown for the last 90 days',
    example: 15.7,
  })
  drawdown90d: number;

  @ApiProperty({
    description: 'Drawdown for the last 180 days',
    example: 18.3,
  })
  drawdown180d: number;

  @ApiProperty({
    description: 'Number of followers',
    example: 250,
  })
  followersCount: number;

  @ApiProperty({
    description: 'The time when the leader was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The time when the leader was last updated',
    example: '2023-01-01T00:00:00Z',
  })
  updatedAt: Date;
}
