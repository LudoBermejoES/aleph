## Why

Aleph has no error tracking. When users hit a bug in production, the only signal is PM2 logs on the server — no alerts, no stack traces with source maps, no visibility into client-side Vue errors. Sentry provides real-time error tracking for both the Vue frontend and Nitro backend, with source map support for readable stack traces, performance monitoring, and alerting — all on the free tier (5K errors/month).

## What Changes

- Install `@sentry/nuxt` and register the module in `nuxt.config.ts`
- Create `sentry.client.config.ts` — initializes Sentry on the client with DSN, replay integration, and performance tracing
- Create `sentry.server.config.ts` — initializes Sentry on the Nitro server
- Configure source map upload at build time via the Sentry Vite plugin (auth token + org/project in nuxt config)
- Add `NUXT_PUBLIC_SENTRY_DSN` to runtime config and `.env.example`
- Add `SENTRY_AUTH_TOKEN` as a GitHub secret for CI/CD source map uploads
- Update the deploy workflow to start the server with `--import` flag for server-side Sentry instrumentation
- Update `ecosystem.config.cjs` to include the `--import` flag for PM2

## Capabilities

### New Capabilities

- `error-tracking`: Sentry error tracking and performance monitoring for both client (Vue) and server (Nitro), with source map upload and alerting.

### Modified Capabilities

_(none)_

## Impact

- **npm dependencies**: `@sentry/nuxt`
- **New files**: `sentry.client.config.ts`, `sentry.server.config.ts`
- **Modified files**: `nuxt.config.ts` (module + sentry config + sourcemap), `ecosystem.config.cjs` (node --import flag), `.github/workflows/deploy.yml` (auth token + start command), `.env.example`
- **GitHub secrets**: New `SENTRY_AUTH_TOKEN` for source map upload during build/deploy
- **Runtime config**: New `NUXT_PUBLIC_SENTRY_DSN`
- **CLI**: No impact — no API or data model changes
- **Server startup**: Production must use `node --import ./.output/server/sentry.server.config.mjs .output/server/index.mjs` for server-side error capture
