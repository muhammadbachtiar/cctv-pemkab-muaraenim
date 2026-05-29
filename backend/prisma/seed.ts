import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const ALL_PERMISSIONS = [
  'camera:create',
  'camera:read',
  'camera:update',
  'camera:delete',
  'camera:stream',
  'camera:manage-access',
  'user:create',
  'user:read',
  'user:update',
  'user:delete',
  'role:manage',
];

const OPERATOR_PERMISSIONS = [
  'camera:create',
  'camera:read',
  'camera:update',
  'camera:stream',
  'camera:manage-access',
  'user:read',
];

const VIEWER_PERMISSIONS = ['camera:read', 'camera:stream'];

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan. Pastikan file .env sudah dikonfigurasi.');
  }
  const url = new URL(connectionString);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', ''),
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter } as any);
}

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log('🌱 Memulai proses seeding database...');

    // 1. Buat Role Admin
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: { permissions: ALL_PERMISSIONS as any },
      create: {
        name: 'admin',
        description: 'Administrator sistem dengan akses penuh ke semua fitur',
        permissions: ALL_PERMISSIONS as any,
      },
    });
    console.log(`✅ Role "${adminRole.name}" berhasil dibuat/diperbarui`);

    // 2. Buat Role Operator
    const operatorRole = await prisma.role.upsert({
      where: { name: 'operator' },
      update: { permissions: OPERATOR_PERMISSIONS as any },
      create: {
        name: 'operator',
        description: 'Operator CCTV yang dapat mengelola kamera dan akses user',
        permissions: OPERATOR_PERMISSIONS as any,
      },
    });
    console.log(`✅ Role "${operatorRole.name}" berhasil dibuat/diperbarui`);

    // 3. Buat Role Viewer
    const viewerRole = await prisma.role.upsert({
      where: { name: 'viewer' },
      update: { permissions: VIEWER_PERMISSIONS as any },
      create: {
        name: 'viewer',
        description: 'Penonton yang hanya bisa melihat kamera yang diizinkan',
        permissions: VIEWER_PERMISSIONS as any,
      },
    });
    console.log(`✅ Role "${viewerRole.name}" berhasil dibuat/diperbarui`);

    // 4. Buat User Admin Pertama (dari .env)
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '';

    if (!adminPassword || adminPassword.length < 6) {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD harus diisi dan minimal 6 karakter di file .env',
      );
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.upsert({
      where: { username: adminUsername },
      update: {},
      create: {
        username: adminUsername,
        passwordHash,
        fullName: 'System Administrator',
        roleId: adminRole.id,
        isActive: true,
      },
    });
    console.log(`✅ User admin "${adminUser.username}" berhasil dibuat/ditemukan`);

    console.log('\n🎉 Seeding selesai!');
    console.log('──────────────────────────────────');
    console.log(`👤 Username : ${adminUsername}`);
    console.log(`🔑 Password : ${adminPassword}`);
    console.log('──────────────────────────────────');
    console.log('⚠️  Segera ubah password admin setelah login pertama!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seeding gagal:', e);
  process.exit(1);
});
