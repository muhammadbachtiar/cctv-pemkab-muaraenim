import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

// Daftar lengkap permissions yang tersedia dalam sistem
export const ALL_PERMISSIONS = [
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

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Nama role sudah digunakan');

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        // Cast ke Prisma.InputJsonValue karena tipe Json
        permissions: (dto.permissions ?? []) as any,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({
      where: { id },
      data: {
        description: dto.description,
        permissions: dto.permissions as any,
      },
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    const usersCount = await this.prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new ConflictException(
        `Role tidak bisa dihapus karena masih digunakan oleh ${usersCount} user`,
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return { message: `Role "${role.name}" berhasil dihapus` };
  }

  getAvailablePermissions() {
    return { permissions: ALL_PERMISSIONS };
  }
}
