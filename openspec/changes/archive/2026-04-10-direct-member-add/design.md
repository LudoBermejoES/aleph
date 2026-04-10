## Context

Currently, campaign membership is granted exclusively through invite tokens (`campaign_invitations` table). A DM generates a link, shares it out-of-band, and the target user must visit it and be authenticated. There is no path for a DM who knows a user's username or email to add them directly.

The `user` table (managed by better-auth) stores `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`. The `campaign_members` table already stores `(campaign_id, user_id, role)` — inserting a row directly is all that's needed at the data layer.

## Goals / Non-Goals

**Goals:**

- Let co-DM+ search for registered users by name or email and add them to a campaign with a chosen role
- Keep the existing invite-link flow fully intact as an alternative
- Expose the direct-add via CLI

**Non-Goals:**

- Admin-level user directory (search is scoped to the adding user's context — returns only minimal info)
- Bulk add
- Notifications to the added user (can be added later)

## Decisions

### 1. Separate endpoint for direct add vs. reusing `/members`

**Decision**: New endpoint `POST /api/campaigns/[id]/members/direct` rather than extending the existing `PUT /api/campaigns/[id]/members/[userId]`.

**Why**: The existing `PUT` is for updating an already-existing member's role. Direct-add is semantically distinct (creating membership without a token). Keeping them separate avoids overloading the route and makes auth checks easier to audit.

### 2. User search scoped by registration only — no campaign context needed

**Decision**: `GET /api/users/search?q=<query>` is available to any authenticated user (not restricted to campaign members).

**Why**: A DM needs to find users before adding them to a campaign — there's no campaign context at search time yet. The response returns only `id`, `name`, and a redacted email (e.g., `l***@example.com`) to avoid exposing full emails to any logged-in user. Full email match still works (exact match returns the user) but partial email matches redact the address.

### 3. No duplicate membership check at UI layer — rely on DB constraint

**Decision**: The `campaign_members` table already has a unique constraint on `(campaign_id, user_id)`. The API returns a clear 409 if the user is already a member. The UI surfaces this error inline.

**Why**: Simpler — no need for a pre-check roundtrip.

### 4. CLI: new `member add <userId>` sub-command

**Decision**: Extend the existing `member` command group in aleph-cli with `member add --user <id|name> --role <role>`.

**Why**: Consistent with how other member operations work in the CLI. The user ID from search results can be piped directly.

## Risks / Trade-offs

- **User enumeration via search**: Returning any result for a name/email confirms the user exists. [Risk: low] → Redacted email display limits exposure. Exact email match is intentional (DM knows the address).
- **Added without consent**: A user can be added to a campaign without accepting an invite. [Risk: acceptable] → They can leave at any time; roles default to the one chosen by the DM. This mirrors how most collaborative tools work.
- **Search performance**: Full-text `LIKE` scan on `user.name` / `user.email` is fine at small scale. [Risk: negligible for now] → Can add index on `name` if needed.
