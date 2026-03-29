## ADDED Requirements

### Requirement: Join page is publicly accessible

The `/join` route SHALL be excluded from the auth middleware redirect so unauthenticated users can land on it without being redirected to `/login`.

#### Scenario: Unauthenticated user opens invite URL

GIVEN a user is not logged in
WHEN they navigate to `/join?token=abc&campaign=xyz`
THEN they see the join page (not redirected to /login)
AND the page shows login and register tabs

### Requirement: Join page validates required query params

If `token` or `campaign` query params are missing, the join page SHALL show an error message instead of the auth forms.

#### Scenario: Missing token param

GIVEN a user navigates to `/join?campaign=xyz` (no token)
THEN the page shows "Invalid invite link — missing token or campaign."

#### Scenario: Missing campaign param

GIVEN a user navigates to `/join?token=abc` (no campaign)
THEN the page shows "Invalid invite link — missing token or campaign."

### Requirement: Authenticated user is joined automatically on page load

If the user already has a valid session when they land on `/join`, the page SHALL immediately call `POST /api/campaigns/:id/join` with the token and redirect to the campaign on success.

#### Scenario: Logged-in user opens invite link

GIVEN a user is already logged in
WHEN they navigate to `/join?token=abc&campaign=xyz`
THEN the join API is called automatically
AND on success they are redirected to `/campaigns/xyz`

#### Scenario: Already a member

GIVEN a logged-in user who is already a campaign member opens the link
WHEN the join API returns 409
THEN they are redirected to `/campaigns/xyz` (treated as success)

#### Scenario: Invalid or expired token for authenticated user

GIVEN a logged-in user opens a link with an invalid token
WHEN the join API returns 404 or 410
THEN the page shows "This invite link is invalid or has expired."

### Requirement: Unauthenticated user can log in and join

The join page SHALL show login and register tabs. After successful login or registration, the join API is automatically called and the user is redirected to the campaign.

#### Scenario: User logs in via join page and joins

GIVEN an unauthenticated user on the join page
WHEN they switch to the Login tab, enter valid credentials, and submit
THEN they are authenticated
AND the join API is called automatically
AND on success they are redirected to `/campaigns/:id`

#### Scenario: New user registers via join page and joins

GIVEN an unauthenticated user on the join page
WHEN they fill in the Register tab (name, email, password) and submit
THEN their account is created and they are logged in
AND the join API is called automatically
AND on success they are redirected to `/campaigns/:id`
