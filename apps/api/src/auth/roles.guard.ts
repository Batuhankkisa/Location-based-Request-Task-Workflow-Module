import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Role } from '@lbrtw/shared';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedUser } from './auth.types';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard {
  canActivate(context: import('@nestjs/common').ExecutionContext) {
    const requiredRoles =
      Reflect.getMetadata(ROLES_KEY, context.getHandler()) ??
      Reflect.getMetadata(ROLES_KEY, context.getClass()) ??
      [];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
