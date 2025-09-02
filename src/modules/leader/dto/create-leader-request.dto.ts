import { LeaderType, RiskLevel } from '../../../constants/leader.constant';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeaderRequestDto {
  @ApiProperty({ description: 'Wallet address of the leader' })
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty({ description: 'Username (optional)', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Leader name', required: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Avatar URL', required: false })
  @IsOptional()
  @IsString()
  avt?: string;

  @ApiProperty({ description: 'Image URL', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ description: 'Leader description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Telegram URL', required: false })
  @IsOptional()
  @IsString()
  telegramUrl?: string;

  @ApiProperty({ description: 'X/Twitter URL', required: false })
  @IsOptional()
  @IsString()
  xUrl?: string;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel, required: false })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiProperty({ description: 'Leader type', enum: LeaderType, required: false, default: LeaderType.TRADER })
  @IsOptional()
  @IsEnum(LeaderType)
  leaderType?: LeaderType;

  @ApiProperty({ description: 'Start trade time', required: false })
  @IsOptional()
  @IsString()
  startTradeTime?: string;
}
