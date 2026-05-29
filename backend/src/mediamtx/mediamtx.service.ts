import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MediaMtxPath {
  name: string;
  source: {
    type: string;
    id: string;
  };
  conf: {
    source: string;
  };
}

@Injectable()
export class MediaMtxService {
  private readonly logger = new Logger(MediaMtxService.name);
  private readonly apiUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9997';
  }

  /**
   * Menambahkan atau mengupdate path kamera di MediaMTX
   */
  async upsertPath(path: string, rtspUrl: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/v3/config/paths/add/${path}`, {
          source: rtspUrl,
          sourceOnDemand: true,
        }),
      );
      this.logger.log(`MediaMTX path ditambahkan: ${path}`);
    } catch (error: any) {
      // Jika sudah ada, lakukan update
      if (error?.response?.status === 400) {
        await this.updatePath(path, rtspUrl);
      } else {
        this.logger.error(
          `Gagal menambahkan path MediaMTX: ${path}`,
          error?.message,
        );
        throw error;
      }
    }
  }

  /**
   * Mengupdate konfigurasi path yang sudah ada di MediaMTX
   */
  async updatePath(path: string, rtspUrl: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.patch(
          `${this.apiUrl}/v3/config/paths/patch/${path}`,
          { source: rtspUrl },
        ),
      );
      this.logger.log(`MediaMTX path diupdate: ${path}`);
    } catch (error: any) {
      this.logger.error(
        `Gagal mengupdate path MediaMTX: ${path}`,
        error?.message,
      );
      throw error;
    }
  }

  /**
   * Menghapus path kamera dari MediaMTX
   */
  async removePath(path: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${this.apiUrl}/v3/config/paths/delete/${path}`,
        ),
      );
      this.logger.log(`MediaMTX path dihapus: ${path}`);
    } catch (error: any) {
      // Jika path tidak ditemukan, abaikan saja
      if (error?.response?.status === 404) {
        this.logger.warn(`Path MediaMTX tidak ditemukan (sudah terhapus?): ${path}`);
        return;
      }
      this.logger.error(
        `Gagal menghapus path MediaMTX: ${path}`,
        error?.message,
      );
      throw error;
    }
  }

  /**
   * Mendapatkan daftar semua path aktif di MediaMTX
   */
  async listPaths(): Promise<MediaMtxPath[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ items: MediaMtxPath[] }>(
          `${this.apiUrl}/v3/paths/list`,
        ),
      );
      return response.data.items ?? [];
    } catch (error: any) {
      this.logger.error('Gagal mendapatkan daftar path MediaMTX', error?.message);
      return [];
    }
  }
}
