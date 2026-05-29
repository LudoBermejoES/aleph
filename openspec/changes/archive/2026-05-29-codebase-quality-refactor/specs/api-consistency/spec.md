## ADDED Requirements

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
