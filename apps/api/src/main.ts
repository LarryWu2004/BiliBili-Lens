import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvFiles } from './env';

loadEnvFiles();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  });
  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`BiliBili Lens API listening on http://localhost:${port}/api`);
}

void bootstrap();
