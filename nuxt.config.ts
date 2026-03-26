// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },
  ssr: false, // SPA mode -- avoids SSR crashes from client-only libs (leaflet, v-network-graph)
  pages: true,

  modules: [
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxt/eslint',
    '@nuxtjs/mdc',
    '@nuxtjs/i18n',
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    langDir: 'locales/',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
  },

  nitro: {
    experimental: {
      websocket: true,
      tasks: true,
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  components: {
    dirs: [
      { path: '~/components/ui', pathPrefix: false, extensions: ['vue'] },
      { path: '~/components', pathPrefix: false, extensions: ['vue'] },
    ],
  },

  tailwindcss: {
    cssPath: ['~/assets/css/main.css', { injectPosition: 'first' }],
  },
})
