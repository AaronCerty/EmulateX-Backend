import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetLeaderTradingPairsRequestDto {
  @ApiProperty({
    description: 'ID of the leader',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  leaderId: string;

  @ApiProperty({
    description: 'Limit of trading pairs to return (default: 3)',
    example: 3,
    required: false,
  })
  @IsOptional()
  limit?: number;
}
