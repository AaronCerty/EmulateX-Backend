import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { COMMON_CONSTANT } from 'src/constants/common.constant';
import { TokenEntity } from 'src/entities/token.entity';
import { TokenController } from 'src/modules/token/token.controller';
import { TokenService } from 'src/modules/token/token.service';

@Module({
  imports: [TypeOrmModule.forFeature([TokenEntity], COMMON_CONSTANT.DATASOURCE.DEFAULT)],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
