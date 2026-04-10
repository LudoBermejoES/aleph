## Context

Aleph is a Nuxt 4 full-stack app (Vue 3 client + Nitro server) running on a Linux VPS via PM2. There is currently no error tracking — bugs in production are invisible unless someone checks PM2 logs. The `@sentry/nuxt` module (v10.x) is the official first-party integration, supporting both client and server instrumentation with automatic source map upload.

## Goals / Non-Goals

**Goals:**

- Capture client-side Vue errors and unhandled promise rejections
- Capture server-side Nitro errors (API routes, middleware)
- Upload source maps at build time for readable production stack traces
- Performance tracing (basic — sample rate low enough to stay in free tier)
- Works in the existing PM2 + GitHub Actions deploy pipeline

**Non-Goals:**

- Session replay (can be added later if needed)
- User feedback widget
- Custom Sentry dashboards or alerts (default project alerts are sufficient)
- Sentry for development mode (server-side Sentry only works in production builds)

## Decisions

### 1. @sentry/nuxt module over manual SDK setup

**Decision**: Use `@sentry/nuxt` registered as a Nuxt module.

**Why**: It wraps `@sentry/vue` (client) and `@sentry/node` (server) and auto-configures the Vite plugin for source maps. One package, one module registration, two config files — minimal surface area.

### 2. DSN as public runtime config

**Decision**: Store the DSN in `NUXT_PUBLIC_SENTRY_DSN` (public runtime config, exposed to the client).

**Why**: The DSN is intentionally public — Sentry DSNs are designed to be client-visible. Using runtime config means the DSN can differ per environment without rebuilding.

### 3. Auth token as build-time secret only

**Decision**: `SENTRY_AUTH_TOKEN` is a GitHub Actions secret injected only during `nuxt build` for source map upload. It is NOT stored on the production server.

**Why**: The auth token has write access to the Sentry project. It's only needed at build time, never at runtime.

### 4. Hidden source maps

**Decision**: Set `sourcemap: { client: 'hidden' }` in nuxt config.

**Why**: Source maps are uploaded to Sentry but NOT served to browsers. Users can't inspect minified code, but Sentry can symbolicate stack traces.

### 5. PM2 start command with --import flag

**Decision**: Update `ecosystem.config.cjs` to use `node_args: '--import ./.output/server/sentry.server.config.mjs'`.

**Why**: Sentry's Node.js SDK requires the `--import` flag to instrument the server before it starts. Without it, server-side errors are not captured. PM2 supports `node_args` for this.

### 6. Low trace sample rate

**Decision**: Set `tracesSampleRate: 0.1` (10%) on both client and server.

**Why**: Sentry's free tier has limited quota. 10% sampling provides enough data for performance insights without burning through the allowance.

## Risks / Trade-offs

- **Performance overhead**: Sentry adds ~30KB to the client bundle and marginal CPU overhead for tracing. [Risk: negligible] → The 10% sample rate keeps it minimal.
- **Free tier limits**: 5K errors/month, 10K performance units. [Risk: low] → Aleph is a small-team app. If limits are hit, Sentry drops events gracefully.
- **Server-side Sentry only in production**: Dev mode doesn't capture server errors via Sentry. [Risk: acceptable] → Dev errors are visible in the terminal anyway.
- **Source map upload fails silently**: If `SENTRY_AUTH_TOKEN` is missing or invalid, the build succeeds but source maps aren't uploaded. [Risk: low] → Stack traces are still captured, just minified. The CI logs will show the upload failure.
