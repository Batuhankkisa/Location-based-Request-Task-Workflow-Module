import type { LocationType, OrganizationType, Role } from '@lbrtw/shared';

export interface AdminOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
  telegramEnabled: boolean;
  telegramChatId?: string | null;
  telegramNotificationThreadId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    locations: number;
  };
}

export interface AdminUserOrganization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  organizationId: string | null;
  organization: AdminUserOrganization | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationQrSummary {
  id: string;
  token: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

export interface LocationTreeNode {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: LocationType;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  organization: AdminUserOrganization;
  qrCodes: LocationQrSummary[];
  children: LocationTreeNode[];
}
