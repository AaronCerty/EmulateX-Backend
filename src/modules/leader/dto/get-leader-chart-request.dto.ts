import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ChartDateRange {
  DAY_1 = '1d',
  DAY_7 = '7d',
  DAY_30 = '30d',
}

export enum ChartDataType {
  PNL = 'PNL',
  ROI = 'ROI',
  AUM = 'AUM',
}

export class GetLeaderChartRequestDto {
  @ApiProperty({
    description: 'ID of the leader',
    required: true,
  })
  @IsUUID()
  @IsString()
  leaderId: string;

  @ApiProperty({
    description: 'Date range for chart data (1d, 7d, 30d)',
    enum: ChartDateRange,
    default: ChartDateRange.DAY_7,
  })
  @IsEnum(ChartDateRange)
  @IsOptional()
  dateRange: ChartDateRange = ChartDateRange.DAY_7;

  @ApiProperty({
    description: 'Type of chart data to return (PNL, ROI, AUM)',
    enum: ChartDataType,
    default: ChartDataType.PNL,
  })
  @IsEnum(ChartDataType)
  @IsOptional()
  type: ChartDataType = ChartDataType.PNL;
}
