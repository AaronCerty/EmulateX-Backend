import { ChartDataType, ChartDateRange } from './get-leader-chart-request.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ChartDataPoint {
  @ApiProperty({
    description: 'Timestamp for the data point in ISO format',
    example: '2025-05-14T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Value for the data point',
    example: 31.27,
  })
  value: number;
}

export class GetLeaderChartResponseDto {
  @ApiProperty({
    description: 'Leader ID',
  })
  leaderId: string;

  @ApiProperty({
    description: 'Type of chart data (PNL, ROI, AUM)',
    enum: ChartDataType,
  })
  type: ChartDataType;

  @ApiProperty({
    description: 'Date range for the chart data',
    enum: ChartDateRange,
  })
  dateRange: ChartDateRange;

  @ApiProperty({
    description: 'Array of data points for the chart',
    type: [ChartDataPoint],
  })
  data: ChartDataPoint[];
}
