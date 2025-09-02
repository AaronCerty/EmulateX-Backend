import { ApiProperty } from '@nestjs/swagger';

export class GetMyCopierResponseDto {
  @ApiProperty({ description: 'Copier ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Wallet address of the user' })
  walletAddress: string;

  @ApiProperty({ description: 'Fund wallet address' })
  fundWalletAddress: string;

  @ApiProperty({ description: 'Total balance' })
  totalBalance: number;

  // AUM (Assets Under Management) fields
  @ApiProperty({ description: 'AUM for the last 1 day', required: false })
  aum1d?: number;

  @ApiProperty({ description: 'AUM for the last 7 days', required: false })
  aum7d?: number;

  @ApiProperty({ description: 'AUM for the last 30 days', required: false })
  aum30d?: number;

  // PNL metrics
  @ApiProperty({ description: 'PNL for the last 1 day', required: false })
  pnl1d?: number;

  @ApiProperty({ description: 'PNL for the last 7 days', required: false })
  pnl7d?: number;

  @ApiProperty({ description: 'PNL for the last 30 days', required: false })
  pnl30d?: number;

  // ROI metrics
  @ApiProperty({ description: 'ROI for the last 1 day', required: false })
  roi1d?: number;

  @ApiProperty({ description: 'ROI for the last 7 days', required: false })
  roi7d?: number;

  @ApiProperty({ description: 'ROI for the last 30 days', required: false })
  roi30d?: number;

  // Win rate metrics
  @ApiProperty({ description: 'Win rate for the last 1 day', required: false })
  winRate1d?: number;

  @ApiProperty({ description: 'Win rate for the last 7 days', required: false })
  winRate7d?: number;

  @ApiProperty({ description: 'Win rate for the last 30 days', required: false })
  winRate30d?: number;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether history is synced', required: false })
  historySynced?: boolean;
}
