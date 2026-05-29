import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL tidak ditemukan. Pastikan file .env sudah dikonfigurasi.',
      );
    }

    // Parse MySQL/MariaDB connection URL
    // Format: mysql://user:password@host:3306/dbname
    const url = new URL(connectionString);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
      connectionLimit: 10,
    });

    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Terhubung ke database MariaDB');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
