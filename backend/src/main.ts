import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Konfigurasi Swagger
  const config = new DocumentBuilder()
    .setTitle('CCTV Pemkab Muara Enim API')
    .setDescription('Dokumentasi API Sistem Integrasi CCTV Pemkab Muara Enim')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Masukkan Token JWT Anda',
        in: 'header',
      },
      'JWT-auth', // Nama referensi security schema
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend CCTV berjalan di: http://localhost:${port}`);
  console.log(`📝 Dokumentasi Swagger API: http://localhost:${port}/api/docs`);
}
bootstrap();

