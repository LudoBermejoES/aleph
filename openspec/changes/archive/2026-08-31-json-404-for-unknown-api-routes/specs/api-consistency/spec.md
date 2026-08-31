## ADDED Requirements

### Requirement: An unmatched API path answers 404 with JSON

A request to a path under `/api/` that matches no route SHALL receive a `404` response with a
JSON body. It SHALL NOT fall through to the SPA renderer, and no `/api/**` path SHALL ever
answer with `content-type: text/html`. The catch-all SHALL NOT shadow better-auth's
`/api/auth/**` handler, the websocket routes under `server/routes/api/`, or any existing
endpoint. An unauthenticated request SHALL still be rejected by the auth middleware with `401`
before route matching, so route existence is not disclosed to an anonymous caller.

#### Scenario: A misspelled endpoint is a 404, not a 200

GIVEN an authenticated caller with a valid API key
WHEN it requests `PUT /api/campaigns/:id/sessions/:slug/xpp`, one letter off the real `/xp`
THEN the response is `404` with `content-type: application/json`
AND the real `PUT /api/campaigns/:id/sessions/:slug/xp` still answers `200 application/json`

#### Scenario: No API path answers HTML

GIVEN an authenticated caller
WHEN it requests any of `/api/nope`, `/api/campaigns/nope-nope`, `/api/campaigns/:id/nope`,
`/api/campaigns/:id/sessions/nope/nope`, `/api/a/b/c/d/e/f`
THEN none of the responses has `content-type: text/html`
AND none of them is `200`

#### Scenario: better-auth keeps its own catch-all

GIVEN an unauthenticated caller
WHEN it requests `GET /api/auth/get-session`
THEN the response is `200`
AND when it requests an unknown path under `/api/auth/`, the `404` comes from better-auth —
the body contains neither the `Unknown API route` message nor HTML

#### Scenario: The websocket routes still route

GIVEN an authenticated caller
WHEN it makes a non-upgrade `GET` to `/api/ws` or `/api/tldraw-sync/:diagramId`
THEN the response is `426 Upgrade Required` from the websocket layer, not `404`

#### Scenario: Real endpoints are unaffected

GIVEN an authenticated caller
WHEN it requests `/api/health`, `/api/me`, `/api/campaigns`, `/api/apikeys`
THEN each answers `200` with `content-type: application/json`

#### Scenario: An anonymous caller cannot tell a real route from a fake one

GIVEN a caller with no session and no API key
WHEN it requests `/api/definitely-not-a-route` and `/api/campaigns`
THEN both answer `401`
