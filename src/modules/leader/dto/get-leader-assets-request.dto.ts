import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum AssetTimeRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_EIGHTY_DAYS = '180d',
}

export class GetLeaderAssetsRequestDto {
  @ApiProperty({
    description: 'ID of the leader',
    required: true,
  })
  @IsUUID()
  @IsString()
  leaderId: string;

  @ApiProperty({
    description: 'Time range for the asset data',
    enum: AssetTimeRange,
    default: AssetTimeRange.NINETY_DAYS,
  })
  @IsEnum(AssetTimeRange)
  @IsOptional()
  timeRange: AssetTimeRange = AssetTimeRange.NINETY_DAYS;
}
