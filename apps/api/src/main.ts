import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { mkdirSync } from 'node:fs';
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

function runDatabaseMigrations() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const result = spawnSync(command, ['prisma:migrate:deploy'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Database migration failed with exit code ${result.status ?? 'unknown'}`);
  }
}

async function bootstrap() {
  runDatabaseMigrations();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const uploadRoot = resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads');

  mkdirSync(uploadRoot, { recursive: true });
  app.useStaticAssets(uploadRoot, { prefix: '/uploads/' });

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
