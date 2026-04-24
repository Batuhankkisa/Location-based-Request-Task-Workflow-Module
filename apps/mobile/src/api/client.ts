import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

let accessToken: string | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

export async function unwrapResponse<T>(promise: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await promise;
  return response.data.data;
}

export function buildAssetUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return getAxiosErrorMessage(error);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Beklenmeyen bir hata olustu.';
}

function getAxiosErrorMessage(error: AxiosError<{ message?: string | string[]; error?: string }>) {
  if (error.response?.data?.message) {
    const message = error.response.data.message;
    return Array.isArray(message) ? message.join(', ') : message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Sunucu zaman asimina ugradi.';
  }

  if (!error.response) {
    return 'API baglantisi kurulamadı. Base URL ayarini kontrol edin.';
  }

  return 'Istek sirasinda bir hata olustu.';
}
