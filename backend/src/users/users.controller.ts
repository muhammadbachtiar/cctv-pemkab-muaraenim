import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateUserPasswordDto, SyncUserCamerasDto } from './dto/user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('user:read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/reset-password')
  @RequirePermissions('user:update')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.usersService.remove(id, requesterId);
  }

  @Get(':id/cameras')
  @RequirePermissions('user:read')
  getUserCameraAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getUserCameraAccess(id);
  }

  @Post(':id/cameras')
  @RequirePermissions('camera:manage-access')
  syncUserCameras(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncUserCamerasDto,
  ) {
    return this.usersService.syncUserCameras(id, dto);
  }
}
