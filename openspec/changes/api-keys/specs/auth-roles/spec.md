## MODIFIED Requirements

### Requirement: User Authentication
The system SHALL support secure user registration, login, and session management. In addition, the system SHALL support API key authentication via the `X-API-Key` request header.

#### Scenario: User registration
- GIVEN a visitor on the registration page
- WHEN they submit a valid username, email, and password
- THEN a new user account is created with the default system role (Visitor)
- AND a session is established
- AND the password is stored as a bcrypt/argon2 hash, never in plaintext

#### Scenario: User login
- GIVEN a registered user
- WHEN they submit valid credentials
- THEN a session token is issued (httpOnly cookie)
- AND the user is redirected to their dashboard

#### Scenario: Invalid login
- GIVEN invalid credentials
- WHEN the user submits the login form
- THEN an error is displayed without revealing whether the username or password was wrong
- AND failed attempts are rate-limited (5 attempts per 15 minutes per IP)

#### Scenario: Session expiration
- GIVEN an authenticated user with an idle session
- WHEN the session exceeds the idle timeout (configurable, default 7 days)
- THEN the session is invalidated
- AND the user must re-authenticate

#### Scenario: Two-factor authentication (optional)
- GIVEN an Admin enables 2FA on their account
- WHEN they log in with valid credentials
- THEN they are prompted for a TOTP code before the session is established

#### Scenario: API key authentication
- GIVEN a request with header `X-API-Key: <valid raw key>`
- WHEN the middleware receives the request
- THEN it hashes the key (sha256), looks up the matching non-revoked `api_key` row, and sets the user context
- AND the request proceeds with full user identity (same as cookie session)

#### Scenario: Revoked or unknown API key rejected
- GIVEN a request with header `X-API-Key: <revoked or unknown key>`
- WHEN the middleware receives the request
- THEN it returns 401 Unauthorized
