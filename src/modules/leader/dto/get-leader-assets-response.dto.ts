import { ApiProperty } from '@nestjs/swagger';

export class AssetData {
  @ApiProperty({ description: 'Asset name/symbol' })
  name: string;

  @ApiProperty({ description: 'Percentage allocation of the asset' })
  percentage: number;
}

export class GetLeaderAssetsResponseDto {
  @ApiProperty({ description: 'Leader ID' })
  leaderId: string;

  @ApiProperty({ description: 'Time range for the data' })
  timeRange: string;

  @ApiProperty({ description: 'Array of asset allocations' })
  assets: AssetData[];
}
