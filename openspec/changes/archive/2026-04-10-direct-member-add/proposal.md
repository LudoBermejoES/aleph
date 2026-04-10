## Why

Campaign managers (DMs) can currently only invite users via a shareable token link — there is no way to add a user who already has an account directly by searching for them. This creates friction when a DM knows their players are already registered and just wants to add them without sending and copying a link.

## What Changes

- Add a search endpoint to look up existing users by username or email (restricted to co-DM+ and only returning minimal public info)
- Add a new API endpoint to directly add an existing user to a campaign with a specified role, bypassing the invite token flow
- Update the Members UI to show a "Add existing user" form alongside the existing invite link generator

## Capabilities

### New Capabilities

- `direct-member-add`: Search for registered users and add them directly to a campaign with a chosen role, without requiring an invite link.

### Modified Capabilities

_(none — the invite link flow is unchanged; this adds an alternative path)_

## Impact

- **New API endpoints**: `GET /api/users/search?q=<query>` (user lookup), `POST /api/campaigns/[id]/members/direct` (direct add)
- **Modified files**: `app/pages/campaigns/[id]/members.vue` — new "Add existing user" UI section
- **New files**: `server/api/users/search.get.ts`, `server/api/campaigns/[id]/members/direct.post.ts`
- **CLI**: New endpoints should be assessed — `aleph-cli` has a `member` command; direct-add should be available from CLI too
- **Auth**: Search endpoint must not expose user data to non-members; direct-add restricted to co-DM+
