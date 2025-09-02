import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class StopCopyTradeDto {
  @ApiProperty({
    description: 'id of the copy trade session',
    required: true,
    example: 'uuid',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  copyTradeSessionId: string;
}
