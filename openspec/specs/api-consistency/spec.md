# api-consistency Specification

## Purpose

Ensure API endpoints and supporting code follow consistent conventions: a single shared role-hierarchy constant, a standardized list-response shape for paginated endpoints, observable error logging (no silent swallowing), and production-safe debug logging.

## Requirements

### Requirement: Single canonical role-hierarchy constant

The role-hierarchy map (`dm=5, co_dm=4, editor=3, player=2, visitor=1`) SHALL be defined exactly once, in `server/utils/permissions.ts`. `server/services/remark-strip-secrets.ts` SHALL import it rather than redefining a local copy.

#### Scenario: remark-strip-secrets imports the shared constant

- **WHEN** `server/services/remark-strip-secrets.ts` needs role levels
- **THEN** it imports `ROLE_HIERARCHY` from `server/utils/permissions` and contains no local redefinition

#### Scenario: Both code paths agree on role ordering

- **WHEN** a role comparison is performed in remark-strip-secrets and in permissions
- **THEN** they produce identical ordering for all five roles (verified by a unit test)

---

### Requirement: Standardized list-response shape

List endpoints that support pagination SHALL return `{ data, meta }`. An endpoint MAY return a raw array only when pagination is explicitly disabled (`pageSize === 0`) or when the list is inherently small and unpaginated by design (which SHALL be documented in the endpoint). The frontend composables and CLI consumers SHALL be updated to match any endpoint whose shape changes.

#### Scenario: Paginated list returns data and meta

- **WHEN** `GET /api/campaigns/:id/maps` is called with default pagination
- **THEN** the response is `{ data: [...], meta: { total, page, pageSize } }`

#### Scenario: pageSize zero returns raw array

- **WHEN** a list endpoint is called with `pageSize=0`
- **THEN** it returns a raw array (pagination explicitly disabled)

#### Scenario: Converted endpoint's consumer updated

- **WHEN** a previously raw-array list endpoint is converted to `{ data, meta }`
- **THEN** its frontend call site (in the relevant composable) and any CLI command consuming it are updated and pass their tests

#### Scenario: Intentionally-raw endpoint documented

- **WHEN** a small list endpoint (e.g., currencies) intentionally returns a raw array
- **THEN** a code comment documents that the raw shape is intentional

---

### Requirement: Errors are not silently swallowed

Empty `catch {}` / `catch (e) {}` blocks that discard errors SHALL be replaced with at least a `console.warn` (gated by `import.meta.dev` where appropriate) or a Sentry breadcrumb, in `app/composables/useSecretReveals.ts`, `app/components/MarkdownEditor.client.vue`, and `app/composables/useCampaignSocket.ts`.

#### Scenario: Failed secret-reveal load is logged

- **WHEN** loading secret reveals fails in `useSecretReveals.ts`
- **THEN** the failure is logged (not silently ignored) so it is observable in development

#### Scenario: Editor sync failure is observable

- **WHEN** a markdown editor sync step fails in `MarkdownEditor.client.vue`
- **THEN** the failure produces a warning rather than being silently skipped

---

### Requirement: Production debug logging removed or gated

Console logging of session/auth details (including user email) in `app/middleware/auth.global.ts` and `app/composables/useAuth.ts` SHALL be removed or gated behind `import.meta.dev` so it does not run on every navigation in production.

#### Scenario: No auth logging in production build

- **WHEN** the app runs in a production build and the user navigates between routes
- **THEN** no session details or user email are written to the browser console

#### Scenario: Debug logging available in development

- **WHEN** the app runs with `import.meta.dev` true
- **THEN** the diagnostic auth logging may still appear (developer opt-in)

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
