import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { MediaMtxService, MediaMtxPath } from './mediamtx.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

interface MediaMtxAuthRequest {
  ip: string;
  user: string;
  password?: string;
  path: string;
  protocol: string;
  id: string;
  action: string;
  query?: string;
}

@ApiTags('MediaMTX')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/mediamtx')
export class MediaMtxController {
  private readonly logger = new Logger(MediaMtxController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mediaMtxService: MediaMtxService,
  ) {}

  /**
   * Webhook endpoint yang dipanggil oleh MediaMTX untuk mengautentikasi
   * setiap akses ke stream. Mengembalikan 200 jika diizinkan, 401 jika tidak.
   */
  @Public()
  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() body: MediaMtxAuthRequest) {
    const { path, query, action } = body;

    // Hanya validasi aksi "read" (menonton stream)
    // Aksi "publish" diperbolehkan untuk source internal
    if (action === 'publish') {
      return { message: 'ok' };
    }

    this.logger.debug(
      `Auth request: path=${path}, action=${action}, query=${query}`,
    );

    // 1. Cari kamera berdasarkan path
    const camera = await this.prisma.camera.findUnique({
      where: { path },
    });

    if (!camera || !camera.isActive) {
      this.logger.warn(`Kamera tidak ditemukan atau tidak aktif: ${path}`);
      throw new UnauthorizedException('Kamera tidak tersedia');
    }

    // 2. Jika kamera public, izinkan langsung tanpa token
    if (camera.isPublic) {
      this.logger.debug(`Kamera public diakses: ${path}`);
      return { message: 'ok' };
    }

    // 3. Kamera private: validasi JWT dari query string
    // MediaMTX mengirim query string seperti "jwt=ey..." atau "token=ey..."
    const token = this.extractTokenFromQuery(query);
    if (!token) {
      this.logger.warn(`Akses kamera private tanpa token: ${path}`);
      throw new UnauthorizedException('Token JWT diperlukan');
    }

    let payload: { sub: string; username: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      this.logger.warn(`Token JWT tidak valid untuk path: ${path}`);
      throw new UnauthorizedException('Token JWT tidak valid atau sudah kedaluwarsa');
    }

    // 4. Cari user beserta role-nya
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User tidak ditemukan atau tidak aktif');
    }

    // 5. Admin melewati semua pengecekan akses
    if (user.role.name === 'admin') {
      this.logger.debug(`Admin mengakses kamera: ${path}`);
      return { message: 'ok' };
    }

    // 6. Cek UserCameraAccess untuk user biasa
    const access = await this.prisma.userCameraAccess.findUnique({
      where: {
        userId_cameraId: {
          userId: user.id,
          cameraId: camera.id,
        },
      },
    });

    if (!access || !access.canView) {
      this.logger.warn(
        `User ${user.username} tidak memiliki akses ke kamera: ${path}`,
      );
      throw new UnauthorizedException('Anda tidak memiliki akses ke kamera ini');
    }

    this.logger.debug(`User ${user.username} diizinkan mengakses: ${path}`);
    return { message: 'ok' };
  }

  /**
   * Endpoint untuk melihat semua path aktif di MediaMTX (Admin only)
   */
  @Get('paths')
  @RequirePermissions('camera:read')
  listActivePaths(): Promise<MediaMtxPath[]> {
    return this.mediaMtxService.listPaths();
  }

  private extractTokenFromQuery(query?: string): string | null {
    if (!query) return null;

    // Coba parse query string: "jwt=TOKEN" atau "token=TOKEN"
    const params = new URLSearchParams(query);
    return params.get('jwt') || params.get('token') || null;
  }
}
