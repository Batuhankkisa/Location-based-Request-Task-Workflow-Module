import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '.env.example') });
config({ path: resolve(process.cwd(), '../../.env.example'), override: false });
config({ path: resolve(process.cwd(), '.env'), override: true });
config({ path: resolve(process.cwd(), '../../.env'), override: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';
  await app.listen(port, host);

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`API listening on http://${displayHost}:${port}`);
}

bootstrap();
