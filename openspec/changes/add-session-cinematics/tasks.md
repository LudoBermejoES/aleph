# Tasks

## 1. Schema and services

- [ ] 1.1 Add `sessionCinematics` to `server/db/schema/sessions.ts`; generate migration `0040_*.sql` with drizzle-kit and check it applies on an empty DB
- [ ] 1.2 `server/services/cinematics.ts`: limits, sniffers (ftyp / webp / html), range parser, credit sanitiser, visibility predicate, storage paths
- [ ] 1.3 Delete cinematic directories in the session delete handler (`sessions/[slug]/index.delete.ts`)

## 2. API

- [ ] 2.1 `cinematics/index.post.ts` and `index.get.ts` (role + visibility, 404 on hidden)
- [ ] 2.2 `cinematics/[cid]/index.put.ts` and `index.delete.ts`
- [ ] 2.3 `cinematics/[cid]/files/[kind].put.ts` streaming to temp file, byte cap (413), sniff, atomic rename, hash
- [ ] 2.4 `cinematics/[cid]/html.get.ts` with sandbox CSP, nosniff, referrer policy, ETag
- [ ] 2.5 `cinematics/[cid]/video.get.ts` and `thumb.get.ts` with Range/206/416/304
- [ ] 2.6 Make `server/middleware/etag.ts` skip the three file routes; make `server/plugins/strip-secrets.ts` leave Buffers/streams alone
- [ ] 2.7 Verify the CSP against the real Kingmaker scene and `xii-el-cuarto-que-come.html` in a browser; trim `unsafe-eval`/`blob:` if unneeded

## 3. UI

- [ ] 3.1 `app/components/SessionCinematics.vue` (video + poster, lazy sandboxed iframe, fullscreen, credits, DM badge/delete)
- [ ] 3.2 Mount it in `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
- [ ] 3.3 i18n keys `sessions.cinematics.*` in `i18n/locales/en.json` and `es.json`

## 4. CLI and skills

- [ ] 4.1 `aleph session cinematic upload|list|update|delete` in `cli/src/commands/session.js`
- [ ] 4.2 Streaming `putFile` (with sha256 skip) in `cli/src/lib/client.js`
- [ ] 4.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` together (bump frontmatter version); update `docs/cli.md`

## 5. Deployment and docs

- [ ] 5.1 `deployment/nginx.conf`: cinematic files location with `client_max_body_size 110m`, `proxy_request_buffering off`, long timeouts; note the manual nginx reload on the server in `deployment/README.md`
- [ ] 5.2 `docs/backup.md` (size cost and exclusion knob) and `docs/content-model.md` (storage layout)

## 6. Tests

- [ ] 6.1 Unit (`tests/unit/`): sniffers, range parser, credit sanitiser (script/javascript: cases), visibility predicate
- [ ] 6.2 Integration (`tests/integration/session-cinematics.test.ts`, server on :3333): CRUD, upload, 413, bad sniff, replace-on-failure, 206/416/304, 401/403/404 matrix, `preview_as`, strip-secrets does not corrupt binary
- [ ] 6.3 Security negative test (Playwright): hostile fixture under the real route cannot read `document.cookie`, `localStorage`, nor call `/api/me`; assert CSP header; mutate (drop `sandbox`) and require red, restart server between edit and run, then remove the mutation and grep for `MUTATION|DISABLED`
- [ ] 6.4 E2E (`tests/e2e/session-cinematics.spec.ts`): DM uploads via API, player sees video + credits, DM-only hidden for player, interactive iframe opens
- [ ] 6.5 CLI test for `upload` (meta parsing, missing file, idempotent re-run)

## 7. Verification

- [ ] 7.1 `npm run lint`, `npm run format`, unit suite, integration suite, e2e for sessions
- [ ] 7.2 Upload the real Kingmaker cinematic to session `25-de-octubre-de-2026` (campaign `1f84e2fa-32ed-40a7-be5a-b645bda0d6af`) and verify as player and DM
- [ ] 7.3 `openspec validate add-session-cinematics --strict`
