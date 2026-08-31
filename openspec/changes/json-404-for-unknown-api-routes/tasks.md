## 1. Measure

- [x] 1.1 Reproduce against a live dev server with a valid API key and a REAL campaign and
      session: `PUT .../sessions/:slug/xpp` → `200 text/html`, `PUT .../sessions/:slug/xp` →
      `200 application/json`, `GET /api/nope` → `200 text/html`.
- [x] 1.2 Note the trap that makes this easy to mis-measure: with a made-up campaign id the same
      request answers `404 application/json` from `server/middleware/02.campaign.ts`, so the
      defect only shows on a path whose campaign really exists.
- [x] 1.3 Audit for a consumer that depends on the HTML fallthrough on an `/api` path: none in
      `app/`, `cli/` or `tests/`.

## 2. Implement

- [x] 2.1 `server/api/[...].ts` — throw a 404 via `createError`, with statusMessage
      `Not Found` and a message of the form "Unknown API route: METHOD path".

## 3. Tests

- [x] 3.1 `tests/integration/api-unknown-route.test.ts` — seven scenarios: the JSON 404, the
      `/xpp` vs `/xp` pair, five unmatched paths that must never be HTML, better-auth's
      catch-all, both websocket routes, four real endpoints, and the 401-before-404 rule.
- [x] 3.2 Mutation-test: remove `server/api/[...].ts` → 3 failures.
- [x] 3.3 Mutation-test: remove `server/routes/api/ws.ts` → the websocket scenario must go red.
      **It did not, the first time.** The probe was unauthenticated, so `01.auth.ts` answered
      401 before routing and `not.toBe(404)` passed with the route deleted — a test too clean to
      fail. Rewritten to send the API key and assert the exact `426`; re-run under the same
      mutation, it fails. This is the only reason the test is authenticated.
- [x] 3.4 Mutation-test: remove `server/api/auth/[...all].ts` so the catch-all takes `/api/auth/**`
      → the better-auth scenario fails with `expected 404 to be 200` (and the suite's setup fails
      with it, since sign-up goes through that route — which is itself the alarm).
