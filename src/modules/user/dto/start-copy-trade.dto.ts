import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { AllocationType } from 'src/constants/allocation.constant';

export class StartCopyTradeDto {
  @ApiProperty({
    description: 'id of the leader',
    required: true,
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  leaderId: string;

  @ApiProperty({
    description: 'Amount of copiers to copy',
    required: true,
    example: 100,
  })
  @Transform(({ value }) => parseFloat(value))
  @Min(10)
  @Max(20000)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  copyAmount: number;

  @ApiProperty({
    description: 'Total stop loss percent',
    required: true,
    example: 15,
  })
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  @Max(95)
  totalStopLoss: number;

  @ApiProperty({
    description: 'Confirm sharing',
    required: true,
    default: false,
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  confirmSharing: boolean;

  @ApiProperty({
    description: 'Agree service terms',
    required: true,
    default: false,
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  agreeServiceTerms: boolean;

  @ApiProperty({
    description: 'Allocation type',
    required: true,
    enum: AllocationType,
    example: AllocationType.SMART_RATIO,
  })
  @IsNotEmpty()
  @IsEnum(AllocationType)
  allocationType: AllocationType;

  @ApiProperty({
    description: 'Amount per copy trade (only required if allocationType is FIXED_AMOUNT)',
    required: false,
    example: 20,
  })
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(10)
  @IsOptional()
  amountPerCopyTrade?: number;
}
