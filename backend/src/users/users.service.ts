import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto, UpdateUserPasswordDto, SyncUserCamerasDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ passwordHash: _, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        cameraAccess: {
          include: { camera: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) throw new NotFoundException('Role tidak ditemukan');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async resetPassword(id: string, dto: UpdateUserPasswordDto) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { message: 'Password user berhasil direset' };
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('Tidak dapat menghapus akun sendiri');
    }
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User berhasil dihapus' };
  }

  async getUserCameraAccess(userId: string) {
    await this.findOne(userId);
    return this.prisma.userCameraAccess.findMany({
      where: { userId },
      include: { camera: true },
    });
  }

  async syncUserCameras(userId: string, dto: SyncUserCamerasDto) {
    await this.findOne(userId);

    // Verify all cameraIds exist
    if (dto.cameraIds.length > 0) {
      const camerasCount = await this.prisma.camera.count({
        where: { id: { in: dto.cameraIds } }
      });
      if (camerasCount !== dto.cameraIds.length) {
        throw new NotFoundException('Satu atau lebih kamera tidak ditemukan');
      }
    }

    // Wrap in transaction for safety
    return this.prisma.$transaction(async (tx) => {
      // Delete accesses that are not in the list
      await tx.userCameraAccess.deleteMany({
        where: {
          userId,
          cameraId: { notIn: dto.cameraIds },
        },
      });

      // Get remaining/existing accesses
      const existing = await tx.userCameraAccess.findMany({
        where: { userId },
        select: { cameraId: true },
      });
      const existingIds = existing.map((e) => e.cameraId);

      // Create new accesses
      const toAdd = dto.cameraIds.filter((id) => !existingIds.includes(id));
      if (toAdd.length > 0) {
        await tx.userCameraAccess.createMany({
          data: toAdd.map((cameraId) => ({
            userId,
            cameraId,
            canView: true,
          })),
        });
      }

      return tx.userCameraAccess.findMany({
        where: { userId },
        include: { camera: true },
      });
    });
  }
}
