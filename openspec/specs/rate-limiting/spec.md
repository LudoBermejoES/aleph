# rate-limiting Specification

## Purpose

Hardens the API against abuse and cross-site attacks: per-IP rate limiting on every endpoint, classified by HTTP method so that image reads and image writes draw on separate budgets, with stricter caps on auth and upload routes, the health endpoint exempt and expired entries pruned amortized; CSRF tokens issued and validated for cookie-based sessions with `SameSite=Strict` session cookies; and uploaded files verified by magic bytes against their declared MIME type.

## Requirements

### Requirement: Per-IP rate limiting on all API endpoints

The system SHALL enforce per-IP rate limiting on all API endpoints via `server/middleware/02.rate-limit.ts`. Requests exceeding the limit SHALL receive HTTP 429 with a `Retry-After` header. The general allowance SHALL be 1000 requests per 60 seconds per IP.

#### Scenario: Normal usage within limits succeeds

- **WHEN** a client sends 500 requests in 60 seconds to general API endpoints
- **THEN** all requests are processed normally

#### Scenario: Exceeding general rate limit returns 429

- **WHEN** a client sends 1001 requests in 60 seconds to general API endpoints
- **THEN** the 1001st request returns HTTP 429 with `Retry-After` header indicating seconds until the window resets

#### Scenario: Rate limit is per-IP

- **GIVEN** the reverse proxy sets `X-Forwarded-For`
- **WHEN** client A sends 1000 requests and client B sends 1000 requests in 60 seconds
- **THEN** both clients are within their individual limits and all requests succeed

#### Scenario: Rate limit window resets after expiry

- **WHEN** a client hits the rate limit, then waits for the window to expire
- **THEN** subsequent requests succeed

#### Scenario: Server-internal requests are not counted

- **GIVEN** an SSR page render calls an API route in-process, with no socket peer and no forwarding header
- **WHEN** the rate limit middleware runs
- **THEN** the request is not counted, so internal renders for different users do not share a single bucket

---

### Requirement: Rate limit bucket is chosen by HTTP method, not by path substring

Several image endpoints answer on the same path for both reads and writes (`GET`/`POST` on `.../entities/:slug/image`, `.../characters/:slug/portrait`, `.../organizations/:slug/image`, `.../session-groups/:slug/image`). The system SHALL classify a request into a rate limit bucket using its HTTP method as well as its path, so that reads are never charged to the upload (write) budget. Classification SHALL live in a pure, unit-testable function (`classifyRequest` in `server/utils/rate-limit.ts`).

#### Scenario: Image serving does not spend the upload budget

- **GIVEN** a campaign page that renders many character portraits and entity images
- **WHEN** the browser issues more image `GET` requests than the upload allowance
- **THEN** every `GET` succeeds, and a subsequent image upload `POST` still succeeds

#### Scenario: Upload flooding is still refused

- **WHEN** a client sends more image `POST` requests than the upload allowance in 60 seconds
- **THEN** the excess requests return HTTP 429
- **AND** the client's image read budget is unaffected

#### Scenario: No classification rule is dead

- **GIVEN** the set of image routes that actually exist under `server/api/`
- **WHEN** each route's live path and method are classified
- **THEN** every classification rule matches at least one real route (no rule keyed on a substring that no route contains)

---

### Requirement: Stricter rate limiting on auth endpoints

The system SHALL enforce a stricter rate limit on `/api/auth/*` endpoints than on general endpoints: 120 requests per 60 seconds per IP. The allowance accounts for `/api/auth/get-session`, which fires on every route navigation, while still capping credential guessing at 2 requests per second per IP.

#### Scenario: Auth rate limit is stricter than general

- **WHEN** a client sends 121 login attempts in 60 seconds
- **THEN** the 121st request returns HTTP 429

#### Scenario: Auth rate limit does not affect other endpoints

- **WHEN** a client hits the auth rate limit
- **THEN** requests to non-auth endpoints continue to succeed (within general limit)

#### Scenario: Successful login is also rate-limited

- **WHEN** a client sends 120 successful login requests in 60 seconds followed by a 121st
- **THEN** the 121st returns HTTP 429 (rate limiting is not conditional on success/failure)

---

### Requirement: Stricter rate limiting on file upload endpoints

The system SHALL enforce a rate limit of 120 requests per 60 seconds per IP on write requests to image endpoints — paths ending in `/upload`, `/image`, `/images` or `/portrait` with a method other than `GET`, `HEAD` or `OPTIONS`.

#### Scenario: Upload rate limit prevents abuse

- **WHEN** a client sends 121 file upload requests in 60 seconds
- **THEN** the 121st request returns HTTP 429

#### Scenario: Bulk portrait upload for a party succeeds

- **GIVEN** a DM uploading portraits for a dozen characters in quick succession
- **WHEN** the uploads are submitted
- **THEN** all of them succeed

---

### Requirement: Generous rate limiting on image serving endpoints

The system SHALL apply a separate, higher allowance of 1200 requests per 60 seconds per IP to read requests on image-serving endpoints, including `GET /api/campaigns/:id/images/:filename` and `GET /api/campaigns/:id/maps/:slug/tiles/:z/:x/:y`. Tiled map viewports issue one request per tile per pan and zoom, so image reads must not draw on the general budget.

#### Scenario: Panning a tiled map does not exhaust the general budget

- **GIVEN** a map with tiles across several zoom levels
- **WHEN** the viewer pans and zooms, issuing several hundred tile `GET` requests
- **THEN** all tile requests succeed
- **AND** ordinary API requests from the same client still succeed

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
