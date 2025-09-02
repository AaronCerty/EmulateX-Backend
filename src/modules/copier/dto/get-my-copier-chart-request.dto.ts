import { ChartDataType, ChartDateRange } from './get-copier-chart-request.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class GetMyCopierChartRequestDto {
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
