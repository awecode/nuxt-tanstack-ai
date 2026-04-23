export default defineNuxtConfig({
  modules: [
    '@comark/nuxt'
  ],
  vite: {
    plugins: [
      {
        name: 'fix-partial-json',
        resolveId(id) {
          if (id === 'partial-json') {
            return this.resolve('partial-json/dist/index.js', undefined, { skipSelf: true })
          }
        },
      },
    ],
    optimizeDeps: {
      include: [
        'partial-json',
      ],
    },
    ssr: {
      noExternal: ['partial-json'],
    },
  },
})
