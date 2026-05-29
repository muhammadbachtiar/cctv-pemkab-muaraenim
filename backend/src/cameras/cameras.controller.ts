import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CamerasService } from './cameras.service';
import { CreateCameraDto, UpdateCameraDto, GrantAccessDto } from './dto/camera.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cameras')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get()
  @RequirePermissions('camera:read')
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: { name: string },
  ) {
    return this.camerasService.findAll(userId, role.name);
  }

  @Get(':id')
  @RequirePermissions('camera:read')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: { name: string },
  ) {
    return this.camerasService.findOne(id, userId, role.name);
  }

  @Post()
  @RequirePermissions('camera:create')
  create(@Body() dto: CreateCameraDto) {
    return this.camerasService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('camera:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCameraDto,
  ) {
    return this.camerasService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('camera:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.camerasService.remove(id);
  }

  // ─── Manajemen Akses Kamera ───

  @Get(':id/access')
  @RequirePermissions('camera:manage-access')
  getCameraAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.camerasService.getCameraAccess(id);
  }

  @Post(':id/access')
  @RequirePermissions('camera:manage-access')
  grantAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantAccessDto,
  ) {
    return this.camerasService.grantAccess(id, dto);
  }

  @Delete(':id/access/:userId')
  @RequirePermissions('camera:manage-access')
  revokeAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.camerasService.revokeAccess(id, userId);
  }
}
