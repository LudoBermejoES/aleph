import reactSwc from '@vitejs/plugin-react-swc'

import { defineNuxtModule } from '@nuxt/kit'

// Local module: removes vite:vue-jsx at configResolved time (after Nuxt's unshift)
// so plugin-react-swc can exclusively own .tsx files.
const reactIntegrationModule = defineNuxtModule({
  setup(_options, nuxt) {
    // In dev: inject React Fast Refresh preamble into HTML head.
    // Nuxt/Nitro bypasses Vite's transformIndexHtml so plugin-react-swc
    // can't inject it automatically. Not needed in production builds.
    if (nuxt.options.dev) {
      nuxt.options.app.head.script = nuxt.options.app.head.script ?? []
      ;(nuxt.options.app.head.script as { type: string; innerHTML: string }[]).unshift({
        type: 'module',
        innerHTML: `import RefreshRuntime from '/_nuxt/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
window.__vite_plugin_react_preamble_installed__ = true;`,
      })
    }

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
    backup: {
      r2Endpoint: '',
      r2AccessKeyId: '',
      r2SecretAccessKey: '',
      r2Bucket: '',
    },
    public: {
      hocuspocusUrl: 'ws://localhost:3334',
      diagramMultiplayer: false,
      sentryDsn: '',
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
    '@sentry/nuxt/module',
    '@nuxtjs/tailwindcss',
    'shadcn-nuxt',
    '@nuxt/eslint',
    '@nuxtjs/mdc',
    '@nuxtjs/i18n',
    '@nuxt/fonts',
  ],

  fonts: {
    families: [
      // dark-fantasy
      { name: 'Cinzel Decorative', provider: 'google', global: true },
      { name: 'IM Fell English', provider: 'google', global: true },
      // cyberpunk
      { name: 'Orbitron', provider: 'google', global: true },
      { name: 'Share Tech Mono', provider: 'google', global: true },
      // cosmic-horror
      { name: 'Uncial Antiqua', provider: 'google', global: true },
      { name: 'Crimson Text', provider: 'google', global: true },
      // high-fantasy
      { name: 'Cinzel', provider: 'google', global: true },
      { name: 'Lora', provider: 'google', global: true },
      // western
      { name: 'Rye', provider: 'google', global: true },
      { name: 'Playfair Display', provider: 'google', global: true },
      // steampunk
      { name: 'Special Elite', provider: 'google', global: true },
      { name: 'Libre Baskerville', provider: 'google', global: true },
      // eldritch
      { name: 'Trade Winds', provider: 'google', global: true },
      { name: 'IM Fell DW Pica', provider: 'google', global: true },
      // fey-wilds
      { name: 'Pacifico', provider: 'google', global: true },
      { name: 'Nunito', provider: 'google', global: true },
      // undead (Kult style)
      { name: 'Spectral', provider: 'google', global: true },
      // superhero
      { name: 'Bangers', provider: 'google', global: true },
      { name: 'Exo 2', provider: 'google', global: true },
    ],
  },

  // @ts-expect-error -- sentry key is augmented by @sentry/nuxt/module at build time
  sentry: {
    org: 'lb-0j',
    project: 'aleph-qg',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  },

  sourcemap: { client: 'hidden' },

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
    plugins: [
      ...reactSwc(),
      // Production build: SWC plugin is serve-only; use esbuild transform for .tsx
      {
        name: 'react-tsx-build',
        apply: 'build' as const,
        async transform(code: string, id: string) {
          if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) return
          const { transformWithEsbuild } = await import('vite')
          return transformWithEsbuild(code, id, {
            loader: 'tsx',
            jsx: 'automatic',
            jsxImportSource: 'react',
          })
        },
      },
    ],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
  },

  nitro: {
    experimental: {
      websocket: true,
      tasks: true,
    },
    scheduledTasks: {
      '0 3 * * *': ['backup:run'],
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
