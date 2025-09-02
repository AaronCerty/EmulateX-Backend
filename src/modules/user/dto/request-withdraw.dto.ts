import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class RequestWithdrawDto {
  @ApiProperty({
    description: 'Amount of USDC to withdraw',
    required: true,
    example: 100,
  })
  @Transform(({ value }) => parseFloat(value))
  @Min(10)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  amount: number;
}
