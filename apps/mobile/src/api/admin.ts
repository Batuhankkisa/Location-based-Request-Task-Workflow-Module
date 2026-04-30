import type {
  AdminOrganization,
  AdminUser,
  CreateLocationPayload,
  CreateOrganizationPayload,
  CreateUserPayload,
  LocationTreeNode
} from '../types/admin';
import { apiClient, unwrapResponse } from './client';

export const organizationsApi = {
  list() {
    return unwrapResponse<AdminOrganization[]>(apiClient.get('/organizations'));
  },

  create(payload: CreateOrganizationPayload) {
    return unwrapResponse<AdminOrganization>(apiClient.post('/organizations', payload));
  }
};

export const usersApi = {
  list() {
    return unwrapResponse<AdminUser[]>(apiClient.get('/users'));
  },

  create(payload: CreateUserPayload) {
    return unwrapResponse<AdminUser>(apiClient.post('/users', payload));
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
