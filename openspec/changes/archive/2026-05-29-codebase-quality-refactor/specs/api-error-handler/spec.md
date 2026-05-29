## ADDED Requirements

### Requirement: withApiHandler wrapper utility

The system SHALL provide a `withApiHandler(event, handler: () => Promise<T>): Promise<T>` function exported from `server/utils/api-handler.ts`. It SHALL wrap `handler()` in a try/catch; re-throw H3 errors as-is (they already have a statusCode); wrap unexpected errors in a generic HTTP 500 with `{ statusCode: 500, message: 'Internal server error' }` and log them at `error` level via Winston. 4xx errors SHALL be logged at `warn` level.

#### Scenario: Handler succeeds — returns value unchanged

- **WHEN** the wrapped handler resolves successfully with a value
- **THEN** `withApiHandler` returns that value without modification

#### Scenario: Handler throws H3 error — re-throws as-is

- **WHEN** the wrapped handler throws a `createError({ statusCode: 404, message: 'Not found' })`
- **THEN** `withApiHandler` re-throws the same 404 error (preserving statusCode and message)

#### Scenario: Handler throws unexpected error — wraps in 500

- **WHEN** the wrapped handler throws a generic `new Error('DB connection lost')`
- **THEN** `withApiHandler` throws an H3 500 error with `message: 'Internal server error'`

#### Scenario: 4xx errors are logged at warn level

- **WHEN** the wrapped handler throws a 403 H3 error
- **THEN** the error is logged at `warn` level before being re-thrown

#### Scenario: 5xx errors are logged at error level

- **WHEN** the wrapped handler throws an unexpected non-H3 error
- **THEN** the error is logged at `error` level with the original error message included

---

### Requirement: Top 10 largest endpoints adopt withApiHandler

The system SHALL wrap the following endpoints with `withApiHandler` to ensure consistent error handling:

1. `server/api/campaigns/[id]/characters/[slug]/family/index.post.ts`
2. `server/api/campaigns/[id]/characters/[slug]/index.get.ts`
3. `server/api/campaigns/[id]/characters/[slug]/duplicate.post.ts`
4. `server/api/campaigns/[id]/characters/[slug]/index.put.ts`
5. `server/api/campaigns/[id]/characters/index.get.ts`
6. `server/api/campaigns/[id]/sessions/[slug]/index.get.ts`
7. `server/api/campaigns/[id]/sessions/index.get.ts`
8. `server/api/campaigns/[id]/entities/[slug]/index.get.ts`
9. `server/api/campaigns/[id]/entities/index.get.ts`
10. `server/api/campaigns/[id]/index.get.ts`

#### Scenario: Wrapped endpoint returns 500 on unexpected DB error

- **WHEN** any of the above endpoints encounters an unexpected database error at runtime
- **THEN** the client receives `{ statusCode: 500, message: 'Internal server error' }` (not a stack trace or raw error message)

#### Scenario: Wrapped endpoint preserves existing permission checks

- **WHEN** a user without the required role calls any wrapped endpoint
- **THEN** the endpoint still returns HTTP 403 (the existing permission check inside the handler is not affected by the wrapper)

---

### Requirement: Consistent error response shape

All API endpoints wrapped with `withApiHandler` SHALL produce error responses in the shape:

```
{ statusCode: number, message: string, data?: { errors: Array<{ path: string, message: string }> } }
```

The `data.errors` field is only present for 422 validation errors.

#### Scenario: 404 not found error shape

- **WHEN** a resource is not found and `createError({ statusCode: 404, message: 'Character not found' })` is thrown
- **THEN** the response body is `{ statusCode: 404, message: 'Character not found' }`

#### Scenario: 422 validation error includes field errors

- **WHEN** `validateBody` throws a 422 for a missing `name` field
- **THEN** the response body is `{ statusCode: 422, message: 'Validation failed', data: { errors: [{ path: 'name', message: 'Required' }] } }`

#### Scenario: 500 error does not leak internals

- **WHEN** an unexpected error with sensitive details (e.g., DB path, query) is thrown
- **THEN** the client response contains only `{ statusCode: 500, message: 'Internal server error' }` — no stack trace or raw error text
