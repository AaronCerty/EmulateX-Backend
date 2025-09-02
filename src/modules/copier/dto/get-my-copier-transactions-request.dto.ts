import { TransactionType } from '../../../entities/transaction.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Min } from 'class-validator';

export class GetMyCopierTransactionsRequestDto {
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
    description: 'Type of transaction to filter by',
    required: false,
    enum: [...Object.values(TransactionType), 'ALL'],
    default: 'ALL',
    example: 'ALL',
  })
  @IsOptional()
  @IsEnum([...Object.values(TransactionType), 'ALL'])
  type: string = 'ALL';
}
