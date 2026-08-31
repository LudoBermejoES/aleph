/**
 * JSON 404 for any `/api/**` path that no route matches.
 *
 * Without this, an unmatched `/api/...` request falls through to the SPA renderer and comes
 * back **`200 text/html`** — the index skeleton. That is worse than a 404 in the one way that
 * matters: a URL with a typo LOOKS like it works. `PUT /api/campaigns/:id/sessions/:slug/xpp`
 * (one letter off the real `/xp`) answered 200 twice, to two different people, before anyone
 * noticed the body was HTML. Any check of the shape "the endpoint answers, look at the status
 * code" passes against that, which makes this a factory for tests that assert a bug.
 *
 * Nitro's file-based router ranks static segments over dynamic ones over wildcards, so this
 * only ever runs when nothing else claimed the path. It does NOT shadow:
 *   - `server/api/auth/[...all].ts` — better-auth's own catch-all, a longer prefix (`/api/auth/**`)
 *   - `server/routes/api/ws.ts` — the campaign websocket, a static path
 *   - `server/routes/api/tldraw-sync/[diagramId].ts` — a parameter route
 * All three are covered by tests/integration/api-unknown-route.test.ts, because "it still
 * routes" is exactly the part a reader cannot verify by looking at this file.
 *
 * Note the ORDER relative to the middleware stack: `server/middleware/01.auth.ts` runs first
 * and applies to every `/api/` path, matched or not, so an unauthenticated request to a
 * nonexistent route still answers 401 and this handler never runs. That is deliberate — a
 * stranger learns nothing about which routes exist.
 */
export default defineEventHandler((event) => {
  throw createError({
    statusCode: 404,
    statusMessage: 'Not Found',
    message: `Unknown API route: ${event.method} ${getRequestURL(event).pathname}`,
  })
})
