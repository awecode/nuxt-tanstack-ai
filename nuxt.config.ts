export default defineNuxtConfig({
  modules: [
    '@comark/nuxt'
  ],
  vite: {
    optimizeDeps: {
      include: [
        'partial-json',
      ],
    },
  },
})
