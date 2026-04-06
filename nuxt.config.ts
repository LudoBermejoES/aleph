import reactSwc from '@vitejs/plugin-react-swc'
import { defineNuxtModule } from '@nuxt/kit'

// Local module: removes vite:vue-jsx at configResolved time (after Nuxt's unshift)
// so plugin-react-swc can exclusively own .tsx files.
const reactIntegrationModule = defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.hook('vite:extendConfig', (config) => {
      if (!config.plugins) config.plugins = []
      ;(config.plugins as unknown[]).push({
        name: 'nuxt:remove-vue-jsx-for-tsx',
        enforce: 'pre' as const,
        configResolved(resolved: { plugins: { name?: string }[] }) {
          const idx = resolved.plugins.findIndex((p) => p.name === 'vite:vue-jsx')
          if (idx !== -1) resolved.plugins.splice(idx, 1)
        },
      })
    })
  },
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  runtimeConfig: {
    ai: {
      provider: process.env.AI_PROVIDER || '',
      apiKey: process.env.AI_API_KEY || '',
      model: process.env.AI_MODEL || '',
    },
    public: {
      hocuspocusUrl: 'ws://localhost:3334',
    },
  },

  devtools: { enabled: true },

  app: {
    head: {
      title: 'Aleph — TTRPG Campaign Manager',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      // React Fast Refresh preamble — needed in dev since Nuxt/Nitro bypasses
      // Vite's transformIndexHtml where plugin-react-swc normally injects this.
      script: [
        {
          type: 'module',
          innerHTML: `import RefreshRuntime from '/_nuxt/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
window.__vite_plugin_react_preamble_installed__ = true;`,
        },
      ],
      meta: [
        { property: 'og:title', content: 'Aleph — TTRPG Campaign Manager' },
        {
          property: 'og:description',
          content:
            'Manage your tabletop RPG campaigns: characters, sessions, maps, quests and more.',
        },
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
    reactIntegrationModule,
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

  vite: {
    plugins: [reactSwc()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
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
