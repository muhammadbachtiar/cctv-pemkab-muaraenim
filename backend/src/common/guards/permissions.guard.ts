import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Admin bypasses all permission checks
    if (user.role?.name === 'admin') return true;

    // permissions disimpan sebagai Json di MariaDB, pastikan diparse ke array
    const rawPermissions = user.role?.permissions;
    const userPermissions: string[] = this.parsePermissions(rawPermissions);

    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  private parsePermissions(permissions: unknown): string[] {
    if (!permissions) return [];
    if (Array.isArray(permissions)) return permissions as string[];
    if (typeof permissions === 'string') {
      try {
        const parsed = JSON.parse(permissions);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
