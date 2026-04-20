export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function useApiBaseUrl() {
  const config = useRuntimeConfig();
  return config.public.apiBaseUrl;
}

export function useApiFetch<T>(path: string, options = {}) {
  return $fetch<T>(path, {
    baseURL: useApiBaseUrl(),
    ...options
  });
}
