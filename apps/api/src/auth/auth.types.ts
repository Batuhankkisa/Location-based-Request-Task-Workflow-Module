import type { Role } from '@lbrtw/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
