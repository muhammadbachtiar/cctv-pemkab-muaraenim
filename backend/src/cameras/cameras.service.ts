import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaMtxService } from '../mediamtx/mediamtx.service';
import { CreateCameraDto, UpdateCameraDto, GrantAccessDto, SyncCameraUsersDto } from './dto/camera.dto';

@Injectable()
export class CamerasService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CamerasService.name);

  constructor(
    private prisma: PrismaService,
    private mediaMtxService: MediaMtxService,
  ) {}

  /**
   * Lifecycle hook: dijalankan otomatis setelah semua modul NestJS selesai diinisialisasi.
   * Mensinkronisasi semua kamera aktif dari database ke MediaMTX dengan retry.
   */
  async onApplicationBootstrap(): Promise<void> {
    // Mulai loop sinkronisasi latar belakang secara berkala
    this.startPeriodicSync();

    // Tunggu sebentar agar MediaMTX punya waktu untuk siap (keduanya start bersamaan)
    const maxRetries = 5;
    const delayMs = 5000; // 5 detik per retry

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const paths = await this.mediaMtxService.listPaths();
        // Jika berhasil menghubungi MediaMTX, langsung sync
        this.logger.log(`MediaMTX tersedia (attempt ${attempt}), memulai sinkronisasi...`);
        await this.syncAllToMediaMtx();
        return;
      } catch {
        if (attempt < maxRetries) {
          this.logger.warn(
            `MediaMTX belum siap (attempt ${attempt}/${maxRetries}), mencoba lagi dalam ${delayMs / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.error(
            'MediaMTX tidak tersedia setelah beberapa percobaan. Sinkronisasi startup dibatalkan.',
          );
        }
      }
    }
  }

  /**
   * Memulai pencocokan berkala antara database dan MediaMTX untuk memulihkan path jika MediaMTX restart.
   */
  startPeriodicSync(): void {
    setInterval(async () => {
      try {
        const activeCameras = await this.prisma.camera.findMany({
          where: { isActive: true },
        });

        if (activeCameras.length === 0) return;

        const mediaMtxPaths = await this.mediaMtxService.listPaths();
        const mediaMtxPathNames = mediaMtxPaths.map((p) => p.name);

        const missingCameras = activeCameras.filter(
          (camera) => !mediaMtxPathNames.includes(camera.path),
        );

        if (missingCameras.length > 0) {
          this.logger.log(
            `Background Sync: Mendeteksi ${missingCameras.length} kamera aktif hilang dari MediaMTX. Mendaftarkan ulang...`,
          );
          for (const camera of missingCameras) {
            try {
              await this.mediaMtxService.upsertPath(camera.path, camera.rtspUrl);
              this.logger.log(
                `Background Sync: Berhasil memulihkan kamera "${camera.name}" (${camera.path})`,
              );
            } catch (err: any) {
              this.logger.warn(
                `Background Sync: Gagal memulihkan kamera "${camera.name}" (${camera.path}): ${err?.message}`,
              );
            }
          }
        }
      } catch (err: any) {
        this.logger.error('Background Sync: Gagal memproses sinkronisasi berkala MediaMTX', err?.message);
      }
    }, 30000); // Setiap 30 detik
  }


  /**
   * Mendaftarkan ulang semua kamera aktif dari database ke MediaMTX.
   * Berguna ketika MediaMTX restart dan kehilangan konfigurasi path dinamis.
   */
  async syncAllToMediaMtx(): Promise<void> {
    try {
      const cameras = await this.prisma.camera.findMany({
        where: { isActive: true },
      });

      if (cameras.length === 0) {
        this.logger.log('Tidak ada kamera aktif untuk disinkronisasi ke MediaMTX');
        return;
      }

      let successCount = 0;
      for (const camera of cameras) {
        try {
          await this.mediaMtxService.upsertPath(camera.path, camera.rtspUrl);
          successCount++;
        } catch (err: any) {
          this.logger.warn(
            `Gagal sinkronisasi kamera "${camera.name}" (${camera.path}): ${err?.message}`,
          );
        }
      }

      this.logger.log(
        `✅ Sinkronisasi MediaMTX selesai: ${successCount}/${cameras.length} kamera aktif berhasil didaftarkan`,
      );
    } catch (err: any) {
      this.logger.error('Gagal menjalankan sinkronisasi MediaMTX saat startup', err?.message);
    }
  }

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

  async findPublic() {
    const cameras = await this.prisma.camera.findMany({
      where: {
        isActive: true,
        isPublic: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return cameras.map(({ rtspUrl, ...rest }) => rest);
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

  async syncCameraUsers(cameraId: string, dto: SyncCameraUsersDto) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException('Kamera tidak ditemukan');

    // Verify all userIds exist
    if (dto.userIds.length > 0) {
      const usersCount = await this.prisma.user.count({
        where: { id: { in: dto.userIds } }
      });
      if (usersCount !== dto.userIds.length) {
        throw new NotFoundException('Satu atau lebih user tidak ditemukan');
      }
    }

    // Wrap in transaction
    return this.prisma.$transaction(async (tx) => {
      // Delete accesses that are not in the list
      await tx.userCameraAccess.deleteMany({
        where: {
          cameraId,
          userId: { notIn: dto.userIds },
        },
      });

      // Get remaining accesses
      const existing = await tx.userCameraAccess.findMany({
        where: { cameraId },
        select: { userId: true },
      });
      const existingIds = existing.map((e) => e.userId);

      // Create new accesses
      const toAdd = dto.userIds.filter((id) => !existingIds.includes(id));
      if (toAdd.length > 0) {
        await tx.userCameraAccess.createMany({
          data: toAdd.map((userId) => ({
            userId,
            cameraId,
            canView: true,
          })),
        });
      }

      return tx.userCameraAccess.findMany({
        where: { cameraId },
        include: { user: { include: { role: true } } },
      });
    });
  }
}
