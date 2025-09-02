import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    required: true,
    example: '0x61B6280480e1420D4cf6C1BC39BF58C91f2E345C',
    description: 'Ethereum wallet address',
  })
  @IsString()
  walletAddress: string;

  @ApiProperty({
    required: true,
    example: '0x1234567890...',
    description: 'Signature of the authentication message',
  })
  @IsString()
  signature: string;

  @ApiProperty({
    required: true,
    example: 'abc123...',
    description: 'Random nonce from the auth message',
  })
  @IsString()
  nonce: string;

  @ApiProperty({
    required: true,
    example: 1681567942000,
    description: 'Timestamp from the auth message',
  })
  @IsNumber()
  timestamp: number;
}
