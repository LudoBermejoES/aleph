## ADDED Requirements

### Requirement: API key creation
The system SHALL allow authenticated users to create named API keys. The raw key SHALL be returned only once at creation time and never stored in plaintext.

#### Scenario: Successful key creation
- **WHEN** an authenticated user sends `POST /api/apikeys` with `{ "name": "my-key" }`
- **THEN** the system creates an `api_key` row with `keyHash = sha256(rawKey)` and `keyPrefix = rawKey.slice(0, 8)`
- **AND** returns `{ id, name, key: "<raw key>", keyPrefix, createdAt }`
- **AND** the raw key is never stored or returned again

#### Scenario: Key format
- **WHEN** a new key is generated
- **THEN** the raw key SHALL have the format `aleph_<64 lowercase hex chars>` (256-bit entropy)

#### Scenario: Missing name
- **WHEN** `POST /api/apikeys` is called without a `name` field
- **THEN** the server returns 400 with an error message

#### Scenario: Unauthenticated creation
- **WHEN** `POST /api/apikeys` is called without a valid session or API key
- **THEN** the server returns 401

---

### Requirement: API key listing
The system SHALL allow authenticated users to list their own API keys. Keys SHALL NOT expose the hash or raw value.

#### Scenario: List own keys
- **WHEN** an authenticated user sends `GET /api/apikeys`
- **THEN** the server returns an array of `{ id, name, keyPrefix, createdAt, lastUsedAt, revokedAt }` for all keys belonging to that user
- **AND** no other user's keys are included

#### Scenario: Empty list
- **WHEN** a user with no keys sends `GET /api/apikeys`
- **THEN** the server returns an empty array `[]`

---

### Requirement: API key revocation
The system SHALL allow users to revoke their own API keys. Revoked keys SHALL immediately stop authenticating requests.

#### Scenario: Successful revocation
- **WHEN** an authenticated user sends `DELETE /api/apikeys/:id` for a key they own
- **THEN** the server sets `revokedAt = now()` on the key row
- **AND** returns 200

#### Scenario: Revoked key rejected
- **WHEN** a request includes an `X-API-Key` header with a revoked key's raw value
- **THEN** the server returns 401

#### Scenario: Revoke another user's key
- **WHEN** a user sends `DELETE /api/apikeys/:id` for a key owned by a different user
- **THEN** the server returns 404 (does not reveal existence)

---

### Requirement: API key authentication
The system SHALL accept `X-API-Key: <raw key>` as an authentication method on all endpoints that accept cookie sessions.

#### Scenario: Valid API key authenticates request
- **WHEN** a request includes `X-API-Key: aleph_<valid raw key>`
- **THEN** the middleware computes `sha256(rawKey)`, looks up the matching non-revoked row, and sets `event.context.user`
- **AND** the request proceeds as if authenticated via session

#### Scenario: Invalid API key rejected
- **WHEN** a request includes `X-API-Key` with an unknown or malformed value
- **THEN** the server returns 401

#### Scenario: lastUsedAt updated
- **WHEN** a request is authenticated via API key
- **THEN** the `lastUsedAt` field on the key row is updated asynchronously (fire-and-forget)

---

### Requirement: CLI token endpoints removed
The system SHALL remove `POST /api/cli/token` and `DELETE /api/cli/token`.

#### Scenario: Old token endpoint returns 404
- **WHEN** any client calls `POST /api/cli/token`
- **THEN** the server returns 404

#### Scenario: Old Bearer token auth rejected
- **WHEN** a request uses `Authorization: Bearer <token>` (old CLI flow)
- **THEN** the server returns 401 (the middleware no longer checks this header)
