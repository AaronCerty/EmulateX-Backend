import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, Min } from 'class-validator';

export class GetHistoryDto {
  @ApiProperty({
    description: 'Page number for pagination (starting from 1)',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  limit: number = 10;

  @ApiProperty({
    description: 'Type of history to get. deposit or withdraw',
    required: false,
    default: 10,
    example: 'deposit',
  })
  @IsIn(['deposit', 'withdraw'])
  @IsOptional()
  type: string;
}
