## Why

A URL with a typo in it looks like it works.

Measured twice, by two different people, against a running server with a valid API key:

```
PUT /api/campaigns/:id/sessions/:slug/xpp   ->  200 text/html
PUT /api/campaigns/:id/sessions/:slug/xp    ->  200 application/json
```

`/xpp` has never existed. There is no route for it, and there never was. The request falls
through to the SPA renderer and comes back as the index skeleton — with a **200**.

That is worse than a 404 in the one way that matters here. This repository's single most
repeated defect is a test that asserts the bug: eight instances so far, every one of them green
while the code was wrong. A check of the shape "the endpoint responds, look at the status code"
passes against HTML, so any endpoint whose path is misspelled in a test, a composable or a CLI
command is indistinguishable from one that works. It is a factory for exactly that defect.

It also hides real mistakes at runtime: a frontend calling a route that was renamed gets a 200
and a body it cannot parse, instead of a 404 that names the problem.

## What Changes

- **`/api/**`with no matching route answers`404`with a JSON body**, via a Nitro catch-all at`server/api/[...].ts`.
- Nothing else moves. Better-auth's own catch-all (`/api/auth/**`), the campaign websocket
  (`/api/ws`) and the diagram sync socket (`/api/tldraw-sync/:id`) keep answering, and every
  real endpoint keeps its status and content type.
- An **unauthenticated** request to a nonexistent route still answers `401`, not `404` — the
  auth middleware runs before routing, so a stranger still learns nothing about which routes
  exist.

## Non-Goals

- No `405 Method Not Allowed`. A request with the right path and the wrong method currently
  falls through to the renderer too, and now becomes a 404. Distinguishing the two would mean
  enumerating each route's methods; a JSON 404 is already an enormous improvement over
  `200 text/html` and does not pretend to be a routing table.
- Not touching the SPA fallback for non-`/api` paths. A browser navigating to an unknown page
  still gets the app, which is what an SPA is for.
- No change to any existing endpoint's response.

## Impact

- `server/api/[...].ts` (new), `tests/integration/api-unknown-route.test.ts` (new).
- **This is a production behaviour change**, so it was checked rather than assumed: nothing in
  `app/`, `cli/` or `tests/` consumes an `/api/**` 200 that is actually HTML. The app's data
  layer parses JSON, and the CLI's client does too — both already fail on an HTML body, just
  later and less clearly.
- **No aleph-cli change needed.** No endpoint's contract changes; the CLI gains a clearer error
  when a path is wrong, which is the point.
