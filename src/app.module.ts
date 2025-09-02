import { COMMON_CONSTANT } from './constants/common.constant';
import { AuthModule } from './modules/auth/auth.module';
import { CrawlerModule } from './modules/crawler/crawler.module';
import { HealthCheckModule } from './modules/health-check/health-check.module';
import { HyperliquidModule } from './modules/hyperliquid/hyperliquid.module';
import { LeaderModule } from './modules/leader/leader.module';
import { HttpExceptionFilter } from './shared/filters/exception.filter';
import { ThrottlerBehindProxyGuard } from './shared/guards/throttler.guard';
import { ResponseTransformInterceptor } from './shared/interceptors/response.interceptor';
import { ApiConfigService } from './shared/services/api-config.service';
import { SharedModule } from './shared/shared.modules';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopierModule } from 'src/modules/copier/copier.module';
import { FundTransferModule } from 'src/modules/fund-transfer/fund-transfer.module';
import { TokenModule } from 'src/modules/token/token.module';
import { UserModule } from 'src/modules/user/user.module';
import { WebsocketModule } from 'src/modules/websocket/websocket.module';
import { JwtAuthGuard } from 'src/shared/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: COMMON_CONSTANT.THROTTLER.TTL,
        limit: COMMON_CONSTANT.THROTTLER.LIMIT,
      },
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      name: COMMON_CONSTANT.DATASOURCE.DEFAULT,
      imports: [SharedModule],
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) =>
        configService.getPostgresConfig(COMMON_CONSTANT.DATASOURCE.DEFAULT),
    }),
    RedisModule.forRootAsync({
      inject: [ApiConfigService],
      useFactory: (configService: ApiConfigService) => ({
        config: configService.getRedisConfig(),
      }),
    }),
    SharedModule,
    HealthCheckModule,
    CrawlerModule,
    HyperliquidModule,
    AuthModule,
    LeaderModule,
    UserModule,
    CopierModule,
    FundTransferModule,
    WebsocketModule,
    TokenModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
