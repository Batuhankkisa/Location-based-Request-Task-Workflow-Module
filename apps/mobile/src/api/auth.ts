import type { AuthUser, LoginRequest, LoginResponse } from '../types/auth';
import { apiClient, unwrapResponse } from './client';

export const authApi = {
  login(payload: LoginRequest) {
    return unwrapResponse<LoginResponse>(apiClient.post('/auth/login', payload));
  },

  me() {
    return unwrapResponse<AuthUser>(apiClient.get('/auth/me'));
  }
};
