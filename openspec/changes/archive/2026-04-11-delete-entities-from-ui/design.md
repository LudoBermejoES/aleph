## Context

All delete API endpoints already exist (`DELETE /api/campaigns/:id/entities/:slug`, `/characters/:slug`, `/maps/:slug`, `/organizations/:slug`). The `useCampaignApi()` composable exposes `deleteEntity()`, `deleteCharacter()`, `deleteMap()`, and `deleteOrganization()` methods. Location detail already implements the pattern correctly: a destructive button, a `confirm()` dialog, an API call, then a router redirect.

The only missing pieces are the UI controls on the entity, character, map, and organization detail pages, plus the i18n keys for the confirmation messages on the entity and character pages.

Role gating: the campaign member role is available on all detail pages via `useCampaignApi()` or a `role` ref loaded from the campaign member. Only `dm` and `co_dm` should see the delete button.

## Goals / Non-Goals

**Goals:**

- Add delete buttons to entity, character, map, and organization detail pages
- Gate visibility behind `dm`/`co_dm` role check
- Require browser `confirm()` before deletion (same pattern as existing location delete)
- Redirect to the relevant list page after deletion
- Add missing i18n keys

**Non-Goals:**

- Bulk delete from list pages
- Soft delete / trash / undo
- Custom confirmation modal (browser `confirm()` is sufficient and consistent with existing pattern)
- Cascade warnings (e.g. "this character has X relations")

## Decisions

**Reuse the location delete pattern** — location detail already has a working delete with confirm + redirect. All four pages should implement the identical pattern for consistency: `confirmDelete()` → `confirm(t('...confirmDeleteMessage'))` → API call → `router.push(listPath)`.

**Role check via `memberRole` ref** — each detail page already loads the current user's campaign role (or can easily). Show the delete button only when `memberRole === 'dm' || memberRole === 'co_dm'`. This matches how other destructive actions are role-gated in the app.

**No dedicated DeleteButton component** — the delete logic is simple enough (3 lines) and varies only in the API call and redirect path. A shared component would be premature abstraction for four pages.

**i18n keys for missing entities** — `entities.confirmDeleteMessage` and `characters.confirmDeleteMessage` need to be added to `i18n/locales/en.json` and `i18n/locales/es.json` following the existing `locations.confirmDeleteMessage` and `organizations.confirmDeleteMessage` pattern.

## Risks / Trade-offs

- **Accidental deletion** → Mitigated by `confirm()` dialog. A modal would be safer but is out of scope.
- **Role not loaded on mount** → Each page already loads campaign membership; the delete button can be conditionally rendered once role is known (same as edit button gating).
- **Map delete removes tiles** → The existing `maps/[slug]/index.delete.ts` already handles file cleanup server-side; no extra work needed.
