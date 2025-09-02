import { ApiProperty } from '@nestjs/swagger';

export class ChartDataPoint {
  @ApiProperty({ description: 'Timestamp for the data point in ISO format' })
  timestamp: string;

  @ApiProperty({ description: 'Value for the data point (ROI percentage or PNL amount)' })
  value: number;
}

export class GetCopierChartResponseDto {
  @ApiProperty({ description: 'Copier ID', required: false })
  copierId?: string;

  @ApiProperty({ description: 'Type of chart data (PNL, ROI, AUM)' })
  type: string;

  @ApiProperty({ description: 'Date range for the chart data' })
  dateRange: string;

  @ApiProperty({ description: 'Array of data points for the chart' })
  data: ChartDataPoint[];
}
