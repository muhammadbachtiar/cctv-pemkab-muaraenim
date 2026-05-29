import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  roleId?: string;
}

export class UpdateUserPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword: string;
}
