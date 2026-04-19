import { fileURLToPath } from 'node:url';

const devAppManifestPath = fileURLToPath(new URL('./app/app-manifest.ts', import.meta.url));

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  devtools: {
    enabled: false
  },
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    }
  },
  vite: {
    resolve: {
      alias:
        process.env.NODE_ENV === 'development'
          ? {
              '#app-manifest': devAppManifestPath
            }
          : {}
    },
    server: {
      strictPort: true
    }
  },
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-01-01'
});
