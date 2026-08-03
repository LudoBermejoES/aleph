# The `aleph` CLI

A standalone Node.js CLI that drives the same HTTP API as the web app. Ideal for scripted imports, bulk edits, automation, and CI. It lives in `cli/` and is built on Commander.

## Running it

From the repo:

```bash
npm run aleph <command> …        # = node cli/bin/aleph.js
```

Or, where the published package is installed: `aleph <command>` / `npx aleph-cli <command>`.

## Authentication

```bash
npm run aleph login --email you@example.com --password ...
npm run aleph logout
```

`login` creates an API key on the server and stores it (plus its id and the server URL) via [`conf`](https://github.com/sindresorhus/conf) under `projectName: 'aleph'`, so **the path is platform-dependent** — on macOS it lands in `~/Library/Preferences/aleph-nodejs/config.json`, not `~/.aleph/`. Don't hardcode it: `npm run aleph config show` prints the real location (and `getConfigPath()` returns it). The stored key is the **`apiKey`** field, camelCase. Every subsequent command sends it as an `X-API-Key` header (see [auth.md](auth.md)). **That file holds a live credential — never commit it.**

Configure the target server and default campaign with:

```bash
npm run aleph config            # view/set serverUrl, campaignId, …
```

## What it covers

There's a command group per domain — the CLI surface mirrors the app:

`config` · `login` · `logout` · `campaign` · `entity` · `character` · `session` · `session-group` · `member` · `search` · `roll` · `organization` · `location` · `relation` · `map` · `quest` · `calendar` · `timeline` · `item` · `shop` · `currency` · `transaction` · `inventory` · `template` · `tag` · `arc` · `chapter` · `diagram` · `health`

Examples:

```bash
npm run aleph campaign list
npm run aleph character create "Gandalf" --campaign <id> --type npc
npm run aleph character genealogy gandalf --campaign <id> --depth 3
npm run aleph search "ancient sword" --campaign <id>
npm run aleph roll "2d6+3"

# Sessions are filed under narrative arcs by slug; '' unsets (and clears the chapter)
npm run aleph session update <session-slug> --campaign <id> --arc <arc-slug>
npm run aleph session list --campaign <id> --arc <arc-slug>

# A location holds a gallery. Exactly one image is the main one, and that is the one every
# other surface shows (list thumbnail, detail header, map pins, graph, search).
npm run aleph location image-add waterdeep --campaign <id> --file harbour.png --caption "The harbour"
npm run aleph location images waterdeep --campaign <id>          # '*' marks the main image
npm run aleph location image-set-primary waterdeep <imageId> --campaign <id>
```

The gallery commands are the only ones that upload a file, via `postMultipart()`. Two details
that bite otherwise: the MIME type is derived from the **file extension** (the server also
verifies the magic bytes and rejects a mismatch), and `--caption` travels as a second form field
rather than in a JSON body. `image-update --caption ""` clears a caption instead of storing an
empty string, and `image-update` with neither `--caption` nor `--order` fails locally without
sending a request.

## How it's built

```
cli/
  bin/aleph.js          executable entry (shebang)
  src/
    index.js            Commander setup, registers every command
    commands/*.js       one file per domain (campaign.js, character.js, …)
    lib/
      client.js         HTTP client (base URL + API key from config, retries, error formatting)
      config.js         config persistence via `conf` (platform path — see Authentication)
      output.js         pretty terminal output
      arcs.js           arc/chapter helpers: --sort-order parsing, slug-or-id refs, chapter flattening
      date-utils.js     date parsing/formatting shared by the session and calendar commands
```

Because the CLI is just an API client, anything it can do is something the server already exposes — and vice versa. **When you add or change a server endpoint, auth flow, or data model, update the CLI alongside it** (`cli/src/commands/`, and `cli/src/lib/client.js` if the HTTP shape changed).

## Keep the skill docs in sync

**Three** files describe the CLI for AI assistants and must be updated **together** whenever commands change. Nothing enforces that they agree, so updating one and forgetting another silently leaves an assistant reading stale flags:

- `docs/claude-skill.md` — the shareable skill (uses `aleph` / `npx aleph-cli`); installable by other projects.
- `.claude/skills/aleph-cli/SKILL.md` — the local Claude Code skill (uses the absolute `node …/cli/bin/aleph.js` path); bump its frontmatter `version` when updated.
- **`../.claude/skills/aleph-cli/SKILL.md` in the `mago20` superrepo**, where this repo is a submodule. It is a near-verbatim copy of the file above, differing _only_ in the absolute path prefix it tells the assistant to invoke (`/Users/ludo/code/mago20/aleph/cli/bin/aleph.js`).

To verify the last two agree, diff them with the prefixes normalised:

```bash
diff <(sed 's#/Users/ludo/code/aleph/#P/#g' .claude/skills/aleph-cli/SKILL.md) \
     <(sed 's#/Users/ludo/code/mago20/aleph/#P/#g' ../.claude/skills/aleph-cli/SKILL.md)
```

Empty output means they're in sync.
