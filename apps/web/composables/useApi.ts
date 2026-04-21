export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

type ApiErrorShape = {
  data?: {
    message?: string | string[];
  };
  message?: string;
};

export function useApiBaseUrl() {
  const config = useRuntimeConfig();
  return config.public.apiBaseUrl;
}

export function useApiFetch<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const accessToken = useCookie<string | null>('lbrtw_access_token');
  const headers = {
    ...(options.headers as Record<string, string> | undefined),
    ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {})
  };

  return $fetch<T>(path, {
    baseURL: useApiBaseUrl(),
    ...options,
    headers
  });
}

export function getApiErrorMessage(error: unknown, fallback = 'Bir hata olustu.') {
  const apiError = error as ApiErrorShape | undefined;
  const message = apiError?.data?.message ?? apiError?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}
