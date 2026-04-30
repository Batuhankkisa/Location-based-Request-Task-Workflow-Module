import type {
  AdminOrganization,
  AdminUser,
  CreateLocationPayload,
  CreateOrganizationPayload,
  CreateUserPayload,
  LocationTreeNode,
  UpdateOrganizationPayload,
  UpdateUserPayload
} from '../types/admin';
import { apiClient, unwrapResponse } from './client';

export const organizationsApi = {
  list() {
    return unwrapResponse<AdminOrganization[]>(apiClient.get('/organizations'));
  },

  create(payload: CreateOrganizationPayload) {
    return unwrapResponse<AdminOrganization>(apiClient.post('/organizations', payload));
  },

  update(organizationId: string, payload: UpdateOrganizationPayload) {
    return unwrapResponse<AdminOrganization>(apiClient.patch(`/organizations/${organizationId}`, payload));
  }
};

export const usersApi = {
  list() {
    return unwrapResponse<AdminUser[]>(apiClient.get('/users'));
  },

  create(payload: CreateUserPayload) {
    return unwrapResponse<AdminUser>(apiClient.post('/users', payload));
  },

  update(userId: string, payload: UpdateUserPayload) {
    return unwrapResponse<AdminUser>(apiClient.patch(`/users/${userId}`, payload));
  }
};

export const locationsApi = {
  tree() {
    return unwrapResponse<LocationTreeNode[]>(apiClient.get('/locations/tree'));
  },

  create(payload: CreateLocationPayload) {
    return unwrapResponse<LocationTreeNode>(apiClient.post('/locations', payload));
  }
};
