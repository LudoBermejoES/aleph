## 1. CLI Package Scaffold

- [x] 1.1 Create `cli/package.json` with name `aleph-cli`, bin entry `aleph → bin/aleph.js`, and dependencies: `commander`, `chalk`, `ora`, `conf`, `@inquirer/prompts`
- [x] 1.2 Create `cli/bin/aleph.js` — shebang entry point that imports and runs the root commander program
- [x] 1.3 Create `cli/src/index.js` — root commander program with version, description, and subcommand registration
- [x] 1.4 Create `cli/src/lib/config.js` — reads/writes `~/.aleph/config.json` via `conf`; exports `getConfig()`, `setConfig()`, `requireConfig()` (throws if missing)
- [x] 1.5 Create `cli/src/lib/client.js` — thin `fetch` wrapper that reads URL+token from config, sends `Authorization: Bearer`, handles errors → stderr + exit 2
- [x] 1.6 Create `cli/src/lib/output.js` — `print(data, options)` helper: `--json` → `JSON.stringify` to stdout; default → formatted table/text with chalk
- [x] 1.7 Add `"aleph": "node cli/bin/aleph.js"` to root `package.json` scripts
- [x] 1.8 Run `npm install` inside `cli/` to generate `cli/node_modules` and `cli/package-lock.json`

## 2. Server — API Token Endpoint

- [x] 2.1 Create `server/api/cli/token.post.ts` — accepts `{ email, password }`, validates credentials via better-auth, creates a long-lived session token, returns `{ token }`
- [x] 2.2 Add the token endpoint URL (`/api/cli/token`) to `trustedOrigins` exemptions if needed (no CORS concern for server-side)
- [x] 2.3 Create `server/api/cli/token.delete.ts` — invalidates the bearer token (used by `aleph logout`)

## 3. Config and Auth Commands

- [x] 3.1 Create `cli/src/commands/config.js` — `aleph config set --url <url> --token <token>` and `aleph config show` (masks token)
- [x] 3.2 Create `cli/src/commands/login.js` — prompts for email+password via `@inquirer/prompts`, calls `POST /api/cli/token`, stores token via `setConfig()`
- [x] 3.3 Create `cli/src/commands/logout.js` — calls `DELETE /api/cli/token`, clears config token

## 4. Campaign Commands

- [x] 4.1 Create `cli/src/commands/campaign.js` with subcommands:
  - `aleph campaign list` → `GET /api/campaigns`
  - `aleph campaign create --name --description --theme` → `POST /api/campaigns`
  - `aleph campaign show <id>` → `GET /api/campaigns/:id`
  - `aleph campaign delete <id>` → prompts confirmation, then `DELETE /api/campaigns/:id`

## 5. Entity Commands

- [x] 5.1 Create `cli/src/commands/entity.js` with subcommands:
  - `aleph entity list --campaign <id> [--type <type>] [--search <q>]` → `GET /api/campaigns/:id/entities`
  - `aleph entity create --campaign <id> --name --type [--content]` → `POST /api/campaigns/:id/entities`
  - `aleph entity show --campaign <id> <slug>` → `GET /api/campaigns/:id/entities/:slug`
  - `aleph entity edit --campaign <id> <slug> [--name] [--content] [--stdin]` → `PUT /api/campaigns/:id/entities/:slug`
  - `aleph entity delete --campaign <id> <slug>` → prompts confirmation, then `DELETE /api/campaigns/:id/entities/:slug`

## 6. Character Commands

- [x] 6.1 Create `cli/src/commands/character.js` with subcommands:
  - `aleph character list --campaign <id>` → `GET /api/campaigns/:id/characters`
  - `aleph character create --campaign <id> --name [--class]` → `POST /api/campaigns/:id/characters`
  - `aleph character show --campaign <id> <slug>` → `GET /api/campaigns/:id/characters/:slug`

## 7. Session Commands

- [x] 7.1 Create `cli/src/commands/session.js` with subcommands:
  - `aleph session list --campaign <id>` → `GET /api/campaigns/:id/sessions`
  - `aleph session create --campaign <id> --title --date` → `POST /api/campaigns/:id/sessions`
  - `aleph session show --campaign <id> <slug>` → `GET /api/campaigns/:id/sessions/:slug`

## 8. Member Commands

- [x] 8.1 Create `cli/src/commands/member.js` with subcommands:
  - `aleph member list --campaign <id>` → `GET /api/campaigns/:id/members`
  - `aleph member invite --campaign <id> --role <role>` → `POST /api/campaigns/:id/invite`

## 9. Search and Roll Commands

- [x] 9.1 Create `cli/src/commands/search.js` — `aleph search --campaign <id> <query>` → `GET /api/campaigns/:id/search?q=...`
- [x] 9.2 Create `cli/src/commands/roll.js` — `aleph roll --campaign <id> <formula>` → `POST /api/campaigns/:id/roll`; without `--campaign`, evaluate formula locally using a simple dice parser

## 10. Wire Up and Polish

- [x] 10.1 Register all command modules in `cli/src/index.js`
- [x] 10.2 Each subcommand declares its own `--json` flag (global flag removed to avoid Commander conflict)
- [x] 10.3 Ensure all error paths print to stderr and exit with correct codes (1 for usage, 2 for API errors)
- [x] 10.4 Add `--no-color` / `NO_COLOR` env var support via chalk's auto-detection

## 11. Verify

- [x] 11.1 Run `node cli/bin/aleph.js --help` — confirm command tree is printed
- [x] 11.2 Run `node cli/bin/aleph.js campaign --help` — confirm subcommands listed
- [x] 11.3 Manual smoke test: `aleph login` → `aleph campaign list` → `aleph campaign create` → `aleph entity list`
- [x] 11.4 Test `--json` flag: `aleph campaign list --json | jq '.[0].name'` returns campaign name
- [x] 11.5 Test error exit code: `aleph campaign show nonexistent-id; echo $?` prints 2
- [x] 11.6 Add CLI smoke tests to `tests/integration/cli.test.ts` covering: login, campaign list, entity CRUD, search, roll
