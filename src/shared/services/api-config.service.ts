import type { RedisClientOptions } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { isNil } from 'lodash';
import { COMMON_CONSTANT } from 'src/constants/common.constant';

@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  getEnv(key: string): string {
    const value = this.configService.get<string>(key);

    if (isNil(value)) {
      throw new Error(`${key} not set in env yet`);
    }

    return value;
  }

  getPostgresConfig(datasourceName: string): TypeOrmModuleOptions {
    const typeOrmConfig = {
      name: datasourceName,
      type: this.getEnv('DATABASE_TYPE'),
      host: this.getEnv('DATABASE_HOST'),
      port: Number(this.getEnv('DATABASE_PORT')),
      username: this.getEnv('DATABASE_USERNAME'),
      password: this.getEnv('DATABASE_PASSWORD'),
      database: this.getEnv('DATABASE_NAME'),
      logging: this.getEnv('DATABASE_LOG_ENABLE') === 'true',
      // ...(this.getEnv('NODE_ENV') !== 'development' ? { ssl: { rejectUnauthorized: false } } : {}),
      synchronize: false,
      autoLoadEntities: true,
      extra: {
        connectionLimit: this.getEnv('DATABASE_LIMIT_CONNECTION'),
      },
    };

    return typeOrmConfig as TypeOrmModuleOptions;
  }

  getJwtConfig(): JwtModuleOptions {
    return {
      secret: this.getEnv('JWT_ACCESS_TOKEN_SECRET'),
      signOptions: {
        expiresIn: Number(this.getEnv('JWT_ACCESS_TOKEN_EXPIRATION_TIME')),
      },
    };
  }

  getRedisConfig(): RedisClientOptions[] {
    return [
      {
        namespace: COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE,
        connectionName: COMMON_CONSTANT.REDIS_DEFAULT_NAMESPACE,
        url: `redis://${this.getEnv('REDIS_HOST')}:${this.getEnv('REDIS_PORT')}/0`,
      },
    ];
  }

  isCrawlerMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('crawler') || this.getEnv('APP_MODE') === 'full';
  }

  isCopierConsumerMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('copier-consumer') || this.getEnv('APP_MODE') === 'full';
  }

  isLeaderConsumerMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('leader-consumer') || this.getEnv('APP_MODE') === 'full';
  }

  isFundingConsumerMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('funding-consumer') || this.getEnv('APP_MODE') === 'full';
  }

  isCronJobEnable(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('cron-enable') || this.getEnv('APP_MODE') === 'full';
  }

  isConsumerMode(): boolean {
    const modes = this.getEnv('APP_MODE').split(',');
    for (const mode of modes) {
      // Check if mode contains 'consumer' which covers 'consumer', 'leader-consumer', 'copier-consumer', etc.
      if (mode.includes('consumer')) {
        return true;
      }
    }

    return this.getEnv('APP_MODE') === 'full';
  }

  isApiMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('api') || this.getEnv('APP_MODE') === 'full';
  }

  isBlockchainCrawlerMode(): boolean {
    return this.getEnv('APP_MODE').split(',').includes('crawler-blockchain') || this.getEnv('APP_MODE') === 'full';
  }
}
