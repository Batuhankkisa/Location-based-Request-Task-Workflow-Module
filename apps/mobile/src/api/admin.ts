import type { AdminOrganization, AdminUser, LocationTreeNode } from '../types/admin';
import { apiClient, unwrapResponse } from './client';

export const organizationsApi = {
  list() {
    return unwrapResponse<AdminOrganization[]>(apiClient.get('/organizations'));
  }
};

export const usersApi = {
  list() {
    return unwrapResponse<AdminUser[]>(apiClient.get('/users'));
  }
};

export const locationsApi = {
  tree() {
    return unwrapResponse<LocationTreeNode[]>(apiClient.get('/locations/tree'));
  }
};
