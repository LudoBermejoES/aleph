import * as Sentry from '@sentry/nuxt'

const { public: publicConfig } = useRuntimeConfig()

Sentry.init({
  dsn: publicConfig.sentryDsn as string,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})
