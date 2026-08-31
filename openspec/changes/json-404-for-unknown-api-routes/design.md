## Context

Nitro serves `server/api/**` and `server/routes/**` through one router, and anything unmatched
falls through to the renderer. In SPA mode (`ssr: false`) the renderer answers every path with
the index HTML and a 200 — correct for `/anything/a/user/typed`, wrong for `/api/**`.

## Decisions

### D1. A file-based catch-all, not middleware

Nitro middleware runs **before** route matching, so a middleware cannot know whether a route
matched; it would have to re-implement the route table to decide. `server/api/[...].ts` is the
router's own answer to the question: it registers `/api/**`, and rou3 ranks static segments over
dynamic ones over wildcards, so it only ever runs when nothing else claimed the path.

Rejected: hooking `render:response` / the error handler to rewrite an HTML response on an `/api`
path. That inspects the answer instead of the routing, and it would have to guess whether a
200 HTML body was a fallthrough or a deliberate HTML endpoint.

### D2. What it must not shadow — and how that is proven

Three route families overlap the wildcard:

| Route                         | Where                                          | Why it wins            |
| ----------------------------- | ---------------------------------------------- | ---------------------- |
| `/api/auth/**`                | `server/api/auth/[...all].ts`                  | longer wildcard prefix |
| `/api/ws`                     | `server/routes/api/ws.ts`                      | static path            |
| `/api/tldraw-sync/:diagramId` | `server/routes/api/tldraw-sync/[diagramId].ts` | parameter route        |

Precedence is a property of rou3, not of this repository, so it is asserted rather than assumed:
`tests/integration/api-unknown-route.test.ts` exercises all three against a live server.

Measured: `/api/auth/get-session` → 200; `/api/auth/<nonsense>` → 404 from **better-auth**, whose
body carries neither our `Unknown API route` marker nor HTML; `/api/ws` and
`/api/tldraw-sync/<id>` → `426 Upgrade Required` from crossws.

### D3. 401 before 404 is deliberate

`server/middleware/01.auth.ts` applies to every `/api/` path, matched or not, so an
unauthenticated request to a nonexistent route is rejected before this handler runs. Left that
way on purpose: an anonymous caller cannot use the 404/401 difference to enumerate routes. The
test pins it, so a future reordering that leaks route existence fails loudly.

### D4. The message names the method and the path

`Unknown API route: PUT /api/...`. Nitro's error payload already reflects the request URL back,
so this adds no exposure, and it turns the typo case into a one-line diagnosis. It is also the
marker the auth-shadowing test looks for the ABSENCE of.

## Risks

- **A path that used to answer 200 HTML now answers 404.** That is the change. The audit for a
  consumer depending on it found none; the residual risk is an untracked caller — which would
  have been reading the SPA skeleton and calling it success.
- **A wrong-method request on a real path now returns 404 rather than falling through.** More
  accurate than before (it was `200 text/html`) but not the ideal 405. See Non-Goals.
