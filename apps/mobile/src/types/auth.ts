import type { OrganizationType, Role } from '@lbrtw/shared';

export interface AuthOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  organization: AuthOrganization | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthUser;
}
