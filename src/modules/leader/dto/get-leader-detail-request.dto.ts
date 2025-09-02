import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetLeaderDetailRequestDto {
  @ApiProperty({
    description: 'The ID of the leader to retrieve',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  leaderId: string;
}
