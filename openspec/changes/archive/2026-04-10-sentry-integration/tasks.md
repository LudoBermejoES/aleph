## 1. Install and Configure Module

- [x] 1.1 Install `@sentry/nuxt` via npm
- [x] 1.2 Register `@sentry/nuxt/module` in `nuxt.config.ts` modules array, add `sentry` config block with org/project/authToken from env, set `sourcemap: { client: 'hidden' }`, add `NUXT_PUBLIC_SENTRY_DSN` to `runtimeConfig.public`
- [x] 1.3 Add `NUXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to `.env.example` with comments

## 2. Sentry Config Files

- [x] 2.1 Create `sentry.client.config.ts` in project root — call `Sentry.init()` with DSN from `useRuntimeConfig().public.sentryDsn`, `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`
- [x] 2.2 Create `sentry.server.config.ts` in project root — call `Sentry.init()` with DSN from `process.env.NUXT_PUBLIC_SENTRY_DSN`, `tracesSampleRate: 0.1`

## 3. Production Startup

- [x] 3.1 Update `ecosystem.config.cjs` — add `node_args: '--import ./.output/server/sentry.server.config.mjs'` to the PM2 app config

## 4. Deploy Pipeline

- [x] 4.1 Add `SENTRY_AUTH_TOKEN` as a GitHub secret (document the step — user must create token at sentry.io)
- [x] 4.2 Update `.github/workflows/deploy.yml` — pass `SENTRY_AUTH_TOKEN` as env var during the `nuxt build` step so source maps are uploaded, inject `NUXT_PUBLIC_SENTRY_DSN` into the server's `.env`

## 5. Sentry Project Setup

- [x] 5.1 Document in a comment or docs: create Sentry project (platform: JavaScript/Nuxt), get DSN, create auth token with `project:releases` and `org:ci` scopes
