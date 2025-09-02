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

export class GetCopierChartRequestDto {
  @ApiProperty({
    description: 'Date range for the chart data (1d, 7d, 30d)',
    enum: ChartDateRange,
    default: ChartDateRange.DAY_7,
  })
  @IsEnum(ChartDateRange)
  @IsOptional()
  dateRange: ChartDateRange = ChartDateRange.DAY_7;

  @ApiProperty({
    description: 'Type of chart data (PNL, ROI, AUM)',
    enum: ChartDataType,
    default: ChartDataType.PNL,
  })
  @IsEnum(ChartDataType)
  @IsOptional()
  type: ChartDataType = ChartDataType.PNL;
}
