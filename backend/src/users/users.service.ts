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
      where: { deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ passwordHash: _, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: true,
        cameraAccess: {
          where: { canView: true, deletedAt: null, camera: { deletedAt: null } },
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
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, deletedAt: null },
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
    const user = await this.findOne(id);

    const now = new Date();
    const archivedUsername = `${user.username.slice(0, 160)}__deleted_${now.getTime()}`;

    await this.prisma.$transaction([
      this.prisma.userCameraAccess.updateMany({
        where: { userId: id, deletedAt: null },
        data: { canView: false, deletedAt: now },
      }),
      this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: now,
          username: archivedUsername,
        },
      }),
    ]);

    return { message: 'User berhasil dihapus' };
  }

  async getUserCameraAccess(userId: string) {
    await this.findOne(userId);
    return this.prisma.userCameraAccess.findMany({
      where: {
        userId,
        canView: true,
        deletedAt: null,
        camera: { deletedAt: null },
      },
      include: { camera: true },
    });
  }

  async syncUserCameras(userId: string, dto: SyncUserCamerasDto) {
    await this.findOne(userId);

    // Verify all cameraIds exist and are not soft-deleted
    if (dto.cameraIds.length > 0) {
      const camerasCount = await this.prisma.camera.count({
        where: { id: { in: dto.cameraIds }, deletedAt: null },
      });
      if (camerasCount !== dto.cameraIds.length) {
        throw new NotFoundException('Satu atau lebih kamera tidak ditemukan');
      }
    }

    // Wrap in transaction for safety (Soft Delete & Restore without SQL DELETE)
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Soft-delete accesses that are not in the list
      await tx.userCameraAccess.updateMany({
        where: {
          userId,
          cameraId: { notIn: dto.cameraIds },
          deletedAt: null,
        },
        data: {
          canView: false,
          deletedAt: now,
        },
      });

      // Restore any existing accesses that are in the list
      if (dto.cameraIds.length > 0) {
        await tx.userCameraAccess.updateMany({
          where: {
            userId,
            cameraId: { in: dto.cameraIds },
          },
          data: {
            canView: true,
            deletedAt: null,
          },
        });
      }

      // Get existing rows for the requested cameraIds
      const existing = await tx.userCameraAccess.findMany({
        where: {
          userId,
          cameraId: { in: dto.cameraIds },
        },
        select: { cameraId: true },
      });
      const existingIds = existing.map((e) => e.cameraId);

      // Create new accesses for cameras that have never been linked yet
      const toAdd = dto.cameraIds.filter((id) => !existingIds.includes(id));
      if (toAdd.length > 0) {
        await tx.userCameraAccess.createMany({
          data: toAdd.map((cameraId) => ({
            userId,
            cameraId,
            canView: true,
            deletedAt: null,
          })),
        });
      }

      return tx.userCameraAccess.findMany({
        where: {
          userId,
          canView: true,
          deletedAt: null,
          camera: { deletedAt: null },
        },
        include: { camera: true },
      });
    });
  }
}
