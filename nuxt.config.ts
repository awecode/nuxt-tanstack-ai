export default defineNuxtConfig({
  modules: [
    '@comark/nuxt'
  ],
  runtimeConfig: {
    ai: {
      gatewayId: '',
      vertexProjectId: '',
      vertexLocation: 'global',
    },
    cloudflare: {
      accountId: '',
      token: '',
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'partial-json',
      ],
    },
  },
})
