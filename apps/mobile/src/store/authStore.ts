import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { authApi } from '../api/auth';
import { getApiErrorMessage, setApiAccessToken } from '../api/client';
import type { AuthUser } from '../types/auth';
import { AUTH_TOKEN_KEY } from '../utils/constants';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  token: null,
  user: null,
  error: null,

  async bootstrap() {
    set({ status: 'loading', error: null });

    try {
      const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

      if (!storedToken) {
        setApiAccessToken(null);
        set({ status: 'unauthenticated', token: null, user: null });
        return;
      }

      setApiAccessToken(storedToken);
      const user = await authApi.me();

      set({
        status: 'authenticated',
        token: storedToken,
        user,
        error: null
      });
    } catch (error) {
      setApiAccessToken(null);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      set({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: getApiErrorMessage(error)
      });
    }
  },

  async login(email: string, password: string) {
    set({ status: 'loading', error: null });

    try {
      const response = await authApi.login({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.accessToken);
      setApiAccessToken(response.accessToken);

      set({
        status: 'authenticated',
        token: response.accessToken,
        user: response.user,
        error: null
      });
    } catch (error) {
      setApiAccessToken(null);
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      set({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: getApiErrorMessage(error)
      });
      throw error;
    }
  },

  async logout() {
    setApiAccessToken(null);
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    set({
      status: 'unauthenticated',
      token: null,
      user: null,
      error: null
    });
  },

  clearError() {
    set({ error: null });
  }
}));
