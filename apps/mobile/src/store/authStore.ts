import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
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
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const getWebStorage = () => {
  return (globalThis as { localStorage?: WebStorage }).localStorage ?? null;
};

const tokenStorage = {
  async getItem() {
    if (Platform.OS === 'web') {
      return getWebStorage()?.getItem(AUTH_TOKEN_KEY) ?? null;
    }

    return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async setItem(value: string) {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(AUTH_TOKEN_KEY, value);
      return;
    }

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, value);
  },

  async deleteItem() {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(AUTH_TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  token: null,
  user: null,
  error: null,

  async bootstrap() {
    set({ status: 'loading', error: null });

    try {
      const storedToken = await tokenStorage.getItem();

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
      await tokenStorage.deleteItem();
      set({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: getApiErrorMessage(error)
      });
    }
  },

  async login(email: string, password: string, remember = true) {
    set({ status: 'loading', error: null });

    try {
      const response = await authApi.login({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (remember) {
        await tokenStorage.setItem(response.accessToken);
      } else {
        await tokenStorage.deleteItem();
      }

      setApiAccessToken(response.accessToken);

      set({
        status: 'authenticated',
        token: response.accessToken,
        user: response.user,
        error: null
      });
    } catch (error) {
      setApiAccessToken(null);
      await tokenStorage.deleteItem();
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
    await tokenStorage.deleteItem();
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
