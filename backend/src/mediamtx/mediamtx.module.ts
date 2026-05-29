import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MediaMtxService } from './mediamtx.service';
import { MediaMtxController } from './mediamtx.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  controllers: [MediaMtxController],
  providers: [MediaMtxService],
  exports: [MediaMtxService],
})
export class MediaMtxModule {}
