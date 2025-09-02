import { ApiConfigService } from './services/api-config.service';
import { LogService } from './services/logger.service';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

const providers = [ApiConfigService, LogService];

const jwtModule = JwtModule.registerAsync({
  inject: [ApiConfigService],
  useFactory: (configService: ApiConfigService) => configService.getJwtConfig(),
});
@Global()
@Module({
  providers,
  imports: [HttpModule, jwtModule],
  exports: [...providers, HttpModule, jwtModule],
})
export class SharedModule {}
