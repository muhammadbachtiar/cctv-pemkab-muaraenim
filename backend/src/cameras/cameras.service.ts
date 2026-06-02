import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaMtxService } from '../mediamtx/mediamtx.service';
import { CreateCameraDto, UpdateCameraDto, GrantAccessDto } from './dto/camera.dto';

@Injectable()
export class CamerasService {
  constructor(
    private prisma: PrismaService,
    private mediaMtxService: MediaMtxService,
  ) {}

  /**
   * Mendapatkan semua kamera. Admin mendapat semua, user lain mendapat
   * hanya kamera yang mereka miliki akses atau kamera publik.
   * rtspUrl disembunyikan jika role bukan admin atau operator.
   */
  async findAll(userId: string, userRole: string) {
    let cameras;
    if (userRole === 'admin') {
      cameras = await this.prisma.camera.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } else {
      cameras = await this.prisma.camera.findMany({
        where: {
          OR: [
            { isPublic: true },
            {
              userAccess: {
                some: { userId, canView: true },
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Hanya admin dan operator yang diizinkan melihat URL RTSP asli
    if (userRole !== 'admin' && userRole !== 'operator') {
      return cameras.map(({ rtspUrl, ...rest }) => rest);
    }

    return cameras;
  }

  async findOne(id: string, userId: string, userRole: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: {
        userAccess: {
          include: { user: { include: { role: true } } },
        },
      },
    });

    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    // Admin bisa lihat semua
    if (userRole === 'admin') return camera;

    // Cek apakah user punya akses
    const hasAccess =
      camera.isPublic ||
      camera.userAccess.some((a) => a.userId === userId && a.canView);

    if (!hasAccess) throw new ForbiddenException('Anda tidak memiliki akses ke kamera ini');

    // Hanya admin dan operator yang diizinkan melihat URL RTSP asli
    if (userRole !== 'operator') {
      const { rtspUrl, ...rest } = camera;
      return rest;
    }

    return camera;
  }

  async create(dto: CreateCameraDto) {
    // Cek duplikat path
    const existing = await this.prisma.camera.findUnique({
      where: { path: dto.path },
    });
    if (existing) {
      throw new ConflictException(`Path kamera "${dto.path}" sudah digunakan`);
    }

    // Simpan ke database
    const camera = await this.prisma.camera.create({
      data: {
        name: dto.name,
        path: dto.path,
        rtspUrl: dto.rtspUrl,
        locationName: dto.locationName,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isActive: dto.isActive ?? true,
        isPublic: dto.isPublic ?? false,
      },
    });

    // Sinkronisasi ke MediaMTX jika kamera aktif
    if (camera.isActive) {
      await this.mediaMtxService.upsertPath(camera.path, camera.rtspUrl);
    }

    return camera;
  }

  async update(id: string, dto: UpdateCameraDto) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    const updated = await this.prisma.camera.update({
      where: { id },
      data: dto,
    });

    // Sinkronisasi perubahan ke MediaMTX
    if (updated.isActive) {
      await this.mediaMtxService.upsertPath(updated.path, updated.rtspUrl);
    } else {
      // Jika kamera dinonaktifkan, hapus dari MediaMTX
      await this.mediaMtxService.removePath(updated.path);
    }

    return updated;
  }

  async remove(id: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id } });
    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    // Hapus dari MediaMTX terlebih dahulu
    await this.mediaMtxService.removePath(camera.path);

    // Hapus dari database (cascade akan menghapus UserCameraAccess juga)
    await this.prisma.camera.delete({ where: { id } });

    return { message: `Kamera "${camera.name}" berhasil dihapus` };
  }

  // ───── Manajemen Akses User ─────

  async grantAccess(cameraId: string, dto: GrantAccessDto) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    return this.prisma.userCameraAccess.upsert({
      where: {
        userId_cameraId: { userId: dto.userId, cameraId },
      },
      update: { canView: dto.canView ?? true },
      create: {
        userId: dto.userId,
        cameraId,
        canView: dto.canView ?? true,
      },
    });
  }

  async revokeAccess(cameraId: string, userId: string) {
    const access = await this.prisma.userCameraAccess.findUnique({
      where: { userId_cameraId: { userId, cameraId } },
    });

    if (!access) throw new NotFoundException('Data akses tidak ditemukan');

    await this.prisma.userCameraAccess.delete({
      where: { userId_cameraId: { userId, cameraId } },
    });

    return { message: 'Akses user ke kamera berhasil dicabut' };
  }

  async getCameraAccess(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    return this.prisma.userCameraAccess.findMany({
      where: { cameraId },
      include: {
        user: {
          include: { role: true },
        },
      },
    });
  }
}
