## ADDED Requirements

### Requirement: Per-IP rate limiting on all API endpoints

The system SHALL enforce per-IP rate limiting on all API endpoints via `server/middleware/02.rate-limit.ts`. Requests exceeding the limit SHALL receive HTTP 429 with a `Retry-After` header.

#### Scenario: Normal usage within limits succeeds
- **WHEN** a client sends 50 requests in 60 seconds to general API endpoints
- **THEN** all requests are processed normally

#### Scenario: Exceeding general rate limit returns 429
- **WHEN** a client sends 101 requests in 60 seconds to general API endpoints
- **THEN** the 101st request returns HTTP 429 with `Retry-After` header indicating seconds until the window resets

#### Scenario: Rate limit is per-IP
- **WHEN** client A sends 100 requests and client B sends 100 requests in 60 seconds
- **THEN** both clients are within their individual limits and all requests succeed

#### Scenario: Rate limit window resets after expiry
- **WHEN** a client hits the rate limit, then waits for the window to expire
- **THEN** subsequent requests succeed

---

### Requirement: Stricter rate limiting on auth endpoints

The system SHALL enforce a stricter rate limit on `/api/auth/*` endpoints: 10 requests per 60 seconds per IP. This prevents brute-force attacks on login.

#### Scenario: Auth rate limit is stricter than general
- **WHEN** a client sends 11 login attempts in 60 seconds
- **THEN** the 11th request returns HTTP 429

#### Scenario: Auth rate limit does not affect other endpoints
- **WHEN** a client hits the auth rate limit (10 requests)
- **THEN** requests to non-auth endpoints continue to succeed (within general limit)

#### Scenario: Successful login is also rate-limited
- **WHEN** a client sends 10 successful login requests in 60 seconds followed by an 11th
- **THEN** the 11th returns HTTP 429 (rate limiting is not conditional on success/failure)

---

### Requirement: Stricter rate limiting on file upload endpoints

The system SHALL enforce a rate limit of 20 requests per 60 seconds per IP on file upload endpoints (`**/upload.post.ts`, `**/image.post.ts`, `**/portrait.post.ts`).

#### Scenario: Upload rate limit prevents abuse
- **WHEN** a client sends 21 file upload requests in 60 seconds
- **THEN** the 21st request returns HTTP 429

---

### Requirement: Rate limit does not apply to health endpoint

The system SHALL exempt `GET /api/health` from rate limiting to allow monitoring tools to poll freely.

#### Scenario: Health endpoint is not rate limited
- **WHEN** a monitoring tool sends 200 requests to `GET /api/health` in 60 seconds
- **THEN** all requests succeed

---

### Requirement: Expired rate limit entries are cleaned up

The system SHALL periodically prune expired entries from the in-memory rate limit store to prevent memory growth. Pruning SHALL occur amortized on each request.

#### Scenario: Memory does not grow unboundedly
- **WHEN** many unique IPs make requests over time
- **THEN** entries older than the rate limit window are removed from memory

---

## ADDED Requirements (CSRF)

### Requirement: CSRF token generation for cookie-based sessions

The system SHALL generate a CSRF token and set it as a cookie (`csrf_token`, HttpOnly=false, SameSite=Strict, Secure in production) when a user authenticates via cookie-based session. The token SHALL be a cryptographically random string.

#### Scenario: CSRF cookie is set after login
- **WHEN** a user logs in via the browser (cookie session)
- **THEN** a `csrf_token` cookie is set in the response

#### Scenario: CSRF cookie is readable by JavaScript
- **GIVEN** the `csrf_token` cookie has `HttpOnly=false`
- **WHEN** frontend JavaScript reads `document.cookie`
- **THEN** the CSRF token value is accessible for inclusion in request headers

---

### Requirement: CSRF validation on mutating requests from cookie sessions

The system SHALL validate CSRF tokens on all POST/PUT/PATCH/DELETE requests that use cookie-based authentication. The `X-CSRF-Token` request header must match the `csrf_token` cookie value. Requests authenticated via API key (X-API-Key header) SHALL be exempt.

#### Scenario: Valid CSRF token allows request
- **WHEN** a cookie-authenticated request includes `X-CSRF-Token` header matching the `csrf_token` cookie
- **THEN** the request proceeds normally

#### Scenario: Missing CSRF token on cookie request returns 403
- **WHEN** a cookie-authenticated POST request omits the `X-CSRF-Token` header
- **THEN** the server returns HTTP 403 with message "CSRF token missing"

#### Scenario: Mismatched CSRF token returns 403
- **WHEN** a cookie-authenticated POST request includes an `X-CSRF-Token` header with an incorrect value
- **THEN** the server returns HTTP 403 with message "CSRF token invalid"

#### Scenario: API key requests are exempt from CSRF
- **WHEN** an API key-authenticated POST request omits the `X-CSRF-Token` header
- **THEN** the request proceeds normally (CSRF is a browser-only concern)

#### Scenario: GET requests are exempt from CSRF
- **WHEN** a cookie-authenticated GET request omits the `X-CSRF-Token` header
- **THEN** the request proceeds normally (GET is not a mutating method)

---

### Requirement: SameSite=Strict on session cookies

The system SHALL configure better-auth to set `SameSite=Strict` on all session cookies. This prevents the browser from sending cookies on cross-origin requests.

#### Scenario: Session cookie has SameSite=Strict
- **WHEN** a user logs in
- **THEN** the session cookie's `Set-Cookie` header includes `SameSite=Strict`

#### Scenario: Cross-origin request does not carry session cookie
- **WHEN** a malicious site makes a request to Aleph's API
- **THEN** the browser does not include the session cookie (SameSite=Strict behavior)

---

## MODIFIED Requirements (File Upload)

### Requirement: File uploads validate actual content via magic bytes

The system SHALL verify uploaded file content by checking magic bytes against the declared MIME type. Files whose content does not match the declared type SHALL be rejected with HTTP 400.

#### Scenario: Valid PNG file is accepted
- **WHEN** a file with `Content-Type: image/png` and PNG magic bytes (`89 50 4E 47`) is uploaded
- **THEN** the upload succeeds

#### Scenario: JPEG content declared as PNG is rejected
- **WHEN** a file with `Content-Type: image/png` but JPEG magic bytes (`FF D8 FF`) is uploaded
- **THEN** the server returns HTTP 400 with message indicating MIME type mismatch

#### Scenario: Non-image file with image MIME type is rejected
- **WHEN** a file with `Content-Type: image/png` but content that is an HTML file (starts with `<`) is uploaded
- **THEN** the server returns HTTP 400

#### Scenario: WebP file is validated
- **WHEN** a file with `Content-Type: image/webp` and valid RIFF/WEBP magic bytes is uploaded
- **THEN** the upload succeeds

#### Scenario: Unknown file type is rejected
- **WHEN** a file with unrecognized magic bytes is uploaded
- **THEN** the server returns HTTP 400 with message indicating unrecognized file type
