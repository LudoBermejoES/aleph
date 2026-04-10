## 1. User Search Endpoint

- [x] 1.1 Create `server/api/users/search.get.ts` — query `user` table by name (`LIKE`) or exact email match, require auth, return `id`, `name`, redacted email; reject empty `q` with 400
- [x] 1.2 Add integration test for user search: valid query returns results, unauthenticated returns 401, empty query returns 400

## 2. Direct Member Add Endpoint

- [x] 2.1 Create `server/api/campaigns/[id]/members/direct.post.ts` — accept `{ userId, role }`, verify co-DM+ permission, check user exists, insert into `campaign_members`, return 201; handle 409 on duplicate, 404 on missing user, 400 on invalid role
- [x] 2.2 Add integration tests for direct add: success, 409 duplicate, 404 unknown user, 403 editor role, 401 unauthenticated, 400 invalid role

## 3. Members Page UI

- [x] 3.1 Add "Add existing user" section to `app/pages/campaigns/[id]/members.vue` — visible only to co-DM+; contains a search input that calls `/api/users/search` as the user types (debounced)
- [x] 3.2 Show search results in a dropdown with user name and redacted email; selecting one opens a role picker (co_dm / editor / player / visitor)
- [x] 3.3 On confirm, call `POST /api/campaigns/[id]/members/direct`; on success refresh the members list; on 409 show inline "already a member" error

## 4. CLI

- [x] 4.1 Add `member add` sub-command to `cli/src/commands/member.js` — accepts `--campaign <id>`, `--user <userId>`, `--role <role>`; calls `POST /api/campaigns/[id]/members/direct`; prints success with name and role, or error message
- [x] 4.2 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document `member add`
