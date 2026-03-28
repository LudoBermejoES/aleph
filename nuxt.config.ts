// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  app: {
    head: {
      title: 'Aleph — TTRPG Campaign Manager',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { property: 'og:title', content: 'Aleph — TTRPG Campaign Manager' },
        { property: 'og:description', content: 'Manage your tabletop RPG campaigns: characters, sessions, maps, quests and more.' },
        { property: 'og:image', content: '/logo.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:image', content: '/logo.png' },
      ],
    },
  },
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
