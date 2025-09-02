import { ApiProperty } from '@nestjs/swagger';

export class PositionItem {
  @ApiProperty({
    description: 'Symbol of the asset (coin)',
    example: 'BTC',
  })
  coin: string;

  @ApiProperty({
    description: 'Position size (positive for long, negative for short)',
    example: 1.5,
  })
  szi: number;

  @ApiProperty({
    description: 'Entry price of the position',
    example: 63000.0,
  })
  entryPx: number;

  @ApiProperty({
    description: 'Unrealized profit and loss',
    example: 1500.0,
  })
  unrealizedPnl: number;

  @ApiProperty({
    description: 'Realized profit and loss',
    example: 500.0,
  })
  realizedPnl: number;

  @ApiProperty({
    description: 'Current mark price',
    example: 64000.0,
  })
  markPx: number;

  @ApiProperty({
    description: 'Liquidation price',
    example: 56000.0,
  })
  liqPx: number;

  @ApiProperty({
    description: 'Additional metadata for the position',
    required: false,
  })
  metadata?: any;
}

export class GetPositionsResponseDto {
  @ApiProperty({
    description: 'User identifier (wallet address)',
    example: '0x1234567890abcdef',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'Total account value',
    example: 10000.0,
  })
  accountValue: number;

  @ApiProperty({
    description: 'Total maintenance margin',
    example: 1000.0,
  })
  maintenanceMargin: number;

  @ApiProperty({
    description: 'Initial margin requirement',
    example: 2000.0,
  })
  initialMargin: number;

  @ApiProperty({
    description: 'List of open positions',
    type: [PositionItem],
  })
  positions: PositionItem[];
}
