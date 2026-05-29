import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Aktifkan validasi global menggunakan class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip properti yang tidak ada di DTO
      forbidNonWhitelisted: true, // Tolak request dengan properti tidak dikenal
      transform: true,         // Otomatis transform tipe data (string ke number, dll)
    }),
  );

  // Aktifkan CORS untuk frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend CCTV berjalan di: http://localhost:${port}`);
}
bootstrap();
