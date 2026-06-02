import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CamerasModule } from './cameras/cameras.module';
import { MediaMtxModule } from './mediamtx/mediamtx.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CamerasModule,
    MediaMtxModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard JWT diterapkan secara global ke semua route
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Guard Permissions diterapkan secara global ke semua route
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
