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
  typescript: {
    strict: true
  },
  compatibilityDate: '2025-01-01'
});
