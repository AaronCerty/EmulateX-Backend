import { AppModule } from './app.module';
import { initSwagger } from './configs/swagger.config';
import { ApiConfigService } from './shared/services/api-config.service';
import { SharedModule } from './shared/shared.modules';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { setDefaultResultOrder } from 'node:dns';
import { sendTelegramMessage } from 'src/shared/utils/slack.util';

try {
  setDefaultResultOrder('ipv6first');
} catch (error) {
  console.error('Failed to set default result order ipv6first');
  console.error(error);
}

async function bootstrap() {
  // Set timezone to UTC+0
  process.env.TZ = 'UTC';

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService: ApiConfigService = app.select(SharedModule).get(ApiConfigService);

  const port = configService.getEnv('PORT');
  const appName = configService.getEnv('APP_NAME');

  app.setGlobalPrefix('api');
  initSwagger(app, appName);
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enable('trust proxy');
  app.enableCors();
  app.enableShutdownHooks();

  if (configService.isApiMode()) {
    await app.listen(port, () => {
      console.info(`🚀 server starts at ${port}!`);
    });
  } else {
    await app.init();
  }
}

bootstrap();
