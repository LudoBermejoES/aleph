# Tasks: Secrets System

## 1. Schema & Migration

- [x] 1.1 Create `server/db/schema/secrets.ts` with `secretReveals` table: id, entity_id (FK entities), secret_block_id (text), revealed_by (FK user), revealed_at (timestamp), unique(entity_id, secret_block_id)
- [x] 1.2 Add `entitySecretNotes` table to same schema file: id, entity_id (FK entities, unique), content (text), updated_by (FK user), updated_at (timestamp)
- [x] 1.3 Export both tables from `server/db/schema/index.ts`
- [x] 1.4 Generate and apply Drizzle migration

## 2. Extend SecretBlock with ID Attribute

- [x] 2.1 Update `server/extensions/secret-block.ts`: add `id` attribute (default: null), update `parseHTML` to read `data-secret-id`, update `renderHTML` to emit `data-secret-id`, update `markdownTokenizer` regex to capture optional `#id` from `:::secret{.role #id}`, update `parseMarkdown` and `renderMarkdown` to round-trip the id
- [x] 2.2 Update `server/services/content.ts` `stripSecretBlocks`: add optional third param `revealedBlockIds?: Set<string>`, update regex to capture `#id`, keep revealed blocks (strip wrapper, keep content), preserve existing behavior for blocks without IDs
- [x] 2.3 Update `app/components/MarkdownEditor.client.vue` to display the secret block ID visually in the editor (e.g., a small label showing the ID)

## 3. Secret Reveal API

- [x] 3.1 Create `server/api/campaigns/[id]/entities/[slug]/secrets.get.ts` -- List revealed blocks for an entity (DM/Co-DM only), returns array of `{ blockId, revealedBy, revealedAt }`
- [x] 3.2 Create `server/api/campaigns/[id]/entities/[slug]/secrets.post.ts` -- Reveal a block: validate DM/Co-DM role, insert into `secret_reveals`, broadcast `secret:reveal` via `emitCampaignMessage`, return `{ revealed: true, blockId }`
- [x] 3.3 Create `server/api/campaigns/[id]/entities/[slug]/secrets/[blockId].delete.ts` -- Unreveal a block: validate DM/Co-DM role, delete from `secret_reveals`, broadcast `secret:unreveal`, return `{ revealed: false, blockId }`
- [x] 3.4 Update entity render endpoint (`render.get.ts`) to query `secret_reveals` for the entity and pass revealed IDs to `stripSecretBlocks`
- [x] 3.5 Add `preview_as` query parameter support to the render endpoint: if user is DM/Co-DM and `preview_as` is a valid role, use that role for content stripping instead of the actual role; include `previewMode: true` in response

## 4. Secret Notes API

- [x] 4.1 Create `server/api/campaigns/[id]/entities/[slug]/secret-notes.get.ts` -- Return secret notes content for entity (DM/Co-DM only), return empty content if no record exists
- [x] 4.2 Create `server/api/campaigns/[id]/entities/[slug]/secret-notes.put.ts` -- Upsert secret notes (DM/Co-DM only), validate body has `content` string, insert or update `entity_secret_notes` row

## 5. Preview-as-Player UI

- [x] 5.1 Create `app/components/entity/PreviewRoleSwitcher.vue` -- Dropdown showing "Viewing as: DM" with options for each role; only rendered when user is DM/Co-DM; selecting a role updates `?preview_as=role` query param; shows a colored banner when preview mode is active
- [x] 5.2 Integrate `PreviewRoleSwitcher` into entity view page(s) -- place in entity header area, connect to entity content fetch composable to re-fetch with `preview_as` param

## 6. Secret Reveal UI

- [x] 6.1 Create `app/components/entity/SecretRevealButton.vue` -- Shown on each secret block (DM/Co-DM view only) with "Reveal" / "Unreveal" toggle; calls POST/DELETE secrets API; updates local state immediately (optimistic update)
- [x] 6.2 Add WebSocket listener in entity view for `secret:reveal` and `secret:unreveal` messages -- when received for the current entity, re-fetch or locally patch rendered content
- [x] 6.3 Integrate reveal buttons into the rendered entity view -- detect `data-secret-id` attributes in rendered HTML, overlay reveal controls for DM/Co-DM

## 7. Secret Notes UI

- [x] 7.1 Create `app/components/entity/SecretNotes.vue` -- Collapsible panel in entity view, only shown to DM/Co-DM, loads content from secret-notes GET endpoint, editable with a simple markdown textarea + save button
- [x] 7.2 Integrate `SecretNotes` panel into entity view page(s) -- place below entity content or in a sidebar tab

## 8. i18n

- [x] 8.1 Add English keys to `i18n/locales/en.json`: `secrets.reveal`, `secrets.unreveal`, `secrets.revealed`, `secrets.revealedBy`, `secrets.previewAs`, `secrets.previewBanner`, `secrets.secretNotes`, `secrets.secretNotesPlaceholder`, `secrets.noSecretNotes`, `secrets.saveNotes`, `secrets.notesSaved`
- [x] 8.2 Add corresponding Spanish keys to `i18n/locales/es.json`

## 9. Testing

### 9a. Unit tests

- [x] 9.1 Test `stripSecretBlocks` with `revealedBlockIds` param: revealed blocks kept (wrapper stripped), unrevealed blocks stripped, blocks without IDs follow existing logic
- [x] 9.2 Test `stripSecretBlocks` regex captures `#id` correctly from various formats: `:::secret{.dm #id}`, `:::secret{.player:alice #id}`, `:::secret{.dm}` (no id)
- [x] 9.3 Test SecretBlock Tiptap extension: round-trip markdown with id attribute, round-trip without id, HTML rendering includes `data-secret-id`
- [x] 9.4 Test `secret_reveals` and `entity_secret_notes` schema validation (covered by integration tests via API) (insert, unique constraint, cascade delete)

### 9b. Integration tests (server on port 3333)

- [x] 9.5 Test POST `/api/campaigns/:id/entities/:slug/secrets` -- DM can reveal, player gets 403, unauthenticated gets 401
- [x] 9.6 Test DELETE `/api/campaigns/:id/entities/:slug/secrets/:blockId` -- DM can unreveal, idempotent on non-existent
- [x] 9.7 Test GET `/api/campaigns/:id/entities/:slug/secrets` -- returns revealed blocks, empty array when none
- [x] 9.8 Test GET `/api/campaigns/:id/entities/:slug/secret-notes` -- DM gets content, player gets 403, empty when no record
- [x] 9.9 Test PUT `/api/campaigns/:id/entities/:slug/secret-notes` -- DM can upsert, player gets 403
- [x] 9.10 Test render endpoint with `preview_as` param -- DM gets player-view content, player's `preview_as=dm` is ignored

### 9c. E2E tests (Playwright)

- [x] 9.11 Test DM creates entity with secret block, previews as player (secret hidden), switches back to DM view (secret visible)
- [x] 9.12 Test DM reveals secret block, player (in separate context) sees content appear
- [x] 9.13 Test DM writes and saves secret notes, player cannot see secret notes panel

## 10. Verification

- [x] 10.1 Run `npx vitest run tests/unit/` -- all unit tests pass
- [x] 10.2 Run `npx vitest run tests/integration/` -- all integration tests pass (server on port 3333)
- [x] 10.3 Run `npx playwright test secret-system.spec.ts` -- 3 E2E tests pass
- [x] 10.4 Run `npm run build` -- build succeeds without errors
- [x] 10.5 No lint script available (no new TS errors introduced by this change)
