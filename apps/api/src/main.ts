import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '.env.example') });
config({ path: resolve(process.cwd(), '../../.env.example'), override: false });
config({ path: resolve(process.cwd(), '.env'), override: true });
config({ path: resolve(process.cwd(), '../../.env'), override: true });

function parsePort() {
  const rawPort = process.env.PORT || process.env.API_PORT || '3001';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid API port: ${rawPort}`);
  }

  return port;
}

function parseCorsOrigin() {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;

  if (!rawOrigins) {
    return true;
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    return true;
  }

  return origins;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: parseCorsOrigin(),
    credentials: true
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  const port = parsePort();
  const host = '0.0.0.0';

  await app.listen(port, host);
  console.log(`API listening on http://${host}:${port}`);
}

bootstrap();
