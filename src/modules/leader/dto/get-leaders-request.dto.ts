import { LeaderType, RiskLevel, TimeRange } from '../../../constants/leader.constant';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class GetLeadersRequestDto {
  @ApiProperty({
    required: false,
    default: 1,
    description: 'Page number',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 10,
    description: 'Number of items per page',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    enum: TimeRange,
    description: 'Time range for filtering metrics (1d, 7d, 30d)',
    default: TimeRange.DAYS_7,
  })
  @IsEnum(TimeRange)
  @IsOptional()
  timeRange?: TimeRange = TimeRange.DAYS_7;

  @ApiProperty({
    required: false,
    enum: LeaderType,
    description: 'Type of leader (all, trading_bot, trader)',
    default: LeaderType.ALL,
  })
  @IsEnum(LeaderType)
  @IsOptional()
  type?: LeaderType = LeaderType.ALL;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Minimum PNL for the selected time range',
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @IsOptional()
  minPnl?: number = 0;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Maximum PNL for the selected time range',
    default: 10000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @IsOptional()
  maxPnl?: number = 10000000;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Minimum ROI for the selected time range (%)',
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @IsOptional()
  minRoi?: number = 0;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Maximum ROI for the selected time range (%)',
    default: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @Max(100)
  @IsOptional()
  maxRoi?: number = 100;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Minimum win rate for the selected time range (%)',
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @Max(100)
  @IsOptional()
  minWinRate?: number = 0;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Maximum win rate for the selected time range (%)',
    default: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @Max(100)
  @IsOptional()
  maxWinRate?: number = 100;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Minimum AUM (Assets Under Management) for the selected time range',
    default: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @IsOptional()
  minAum?: number = 0;

  @ApiProperty({
    required: false,
    type: Number,
    description: 'Maximum AUM (Assets Under Management) for the selected time range',
    default: 10000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-999)
  @IsOptional()
  maxAum?: number = 10000000;

  @ApiProperty({
    required: false,
    enum: RiskLevel,
    description: 'Risk level (low, medium, high)',
  })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;
}
