import { ApiProperty } from '@nestjs/swagger';

export class TradingPairDto {
  @ApiProperty({
    description: 'Trading pair name (e.g. BTC/USDT)',
    example: 'BTC/USDT',
  })
  pair: string;

  @ApiProperty({
    description: 'Base currency (e.g. BTC)',
    example: 'BTC',
  })
  base: string;

  @ApiProperty({
    description: 'Quote currency (e.g. USDT)',
    example: 'USDT',
  })
  quote: string;

  @ApiProperty({
    description: 'Percentage of total trading volume',
    example: 24,
  })
  percentage: number;

  @ApiProperty({
    description: 'PNL in USDT',
    example: 832.5,
  })
  pnl: number;
}

export class GetLeaderTradingPairsResponseDto {
  @ApiProperty({
    description: 'ID of the leader',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  leaderId: string;

  @ApiProperty({
    description: 'List of trading pairs',
    type: [TradingPairDto],
  })
  tradingPairs: TradingPairDto[];

  @ApiProperty({
    description: 'Total PNL in USDT',
    example: 15832.5,
  })
  totalPnl: number;
}
