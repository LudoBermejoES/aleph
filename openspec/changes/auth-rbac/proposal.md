# Proposal: Authentication & RBAC

## Why

Every feature in Aleph depends on knowing who the user is and what they're allowed to do. The authentication system and role-based access control must be implemented before any campaign-level features.

## What Changes

- Implement Better Auth with SQLite for user registration, login, and session management
- Create the campaign membership system with role assignment
- Implement the three-tier permission resolution engine
- Add server middleware for auth and campaign RBAC
- Create the permission checking utilities used by all subsequent API routes
- Build login, registration, and user management pages

## Scope

### In scope
- Better Auth integration (credentials, sessions, CSRF)
- User registration and login pages
- Campaign CRUD (create, list, join, leave)
- Campaign membership with role assignment (DM, Co-DM, Editor, Player, Visitor)
- Named permission grants (QuestKeeper, Chronicler, etc.)
- Entity-level permission overrides (allow/deny per user or role)
- Visibility level enforcement (public, members, editors, dm_only, private, specific_users)
- Server middleware: auth guard + campaign RBAC
- Permission caching (in-memory LRU per session)
- Invitation system (token-based links)

### Out of scope
- 2FA (future enhancement)
- OAuth providers (future enhancement)
- Admin panel UI (future enhancement)

## Dependencies
- 01-project-setup
