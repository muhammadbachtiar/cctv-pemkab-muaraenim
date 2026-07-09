import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  Min,
  Max,
  Matches,
  IsArray,
} from 'class-validator';

export class CreateCameraDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Path hanya boleh menggunakan huruf kecil, angka, dan tanda hubung (-). Contoh: jalan-sudirman',
  })
  path: string;

  @IsString()
  rtspUrl: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateCameraDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rtspUrl?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class GrantAccessDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsBoolean()
  canView?: boolean;
}

export class SyncCameraUsersDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
