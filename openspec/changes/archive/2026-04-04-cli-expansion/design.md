# Design: CLI Expansion & TypeScript Migration

## Context

The CLI lives in `cli/` as a standalone Node.js package using Commander.js for command parsing, `@inquirer/prompts` / `readline` / raw stdin for interactive input, and a custom `client.js` for HTTP requests. It has 15 command files in `cli/src/commands/`, a shared `cli/src/lib/` with `client.js`, `config.js`, and `output.js`, and an entry point at `cli/bin/aleph.js`. The server exposes ~140 API endpoints under `server/api/campaigns/[id]/` -- the CLI currently covers roughly 60% of them.

## Goals / Non-Goals

### Goals

1. Reach full API coverage -- every server endpoint has a corresponding CLI command
2. Migrate the CLI to TypeScript for type safety and consistency with the rest of the codebase
3. Standardize all interactive prompts on `@inquirer/prompts`
4. Maintain backward compatibility -- existing command syntax and `~/.aleph/config.json` format do not change

### Non-Goals

- Rewriting Commander.js to a different CLI framework (e.g., oclif, clipanion)
- Adding shell completions or man pages (future enhancement)
- Adding offline mode or local caching
- Changing the authentication mechanism (API keys stay as-is)

## Decisions

### 1. Incremental TypeScript migration (not big-bang)

New commands will be written in TypeScript from the start. Existing commands will be converted in batches grouped by domain (lib files first, then commands alphabetically). The CLI will use `tsx` for development and `tsc` for the build step that produces JavaScript in a `dist/` directory.

**Why:** A big-bang migration risks introducing regressions across all 15 commands simultaneously and blocks new command development until the migration is complete. Incremental migration lets us ship new commands immediately while converting existing ones in manageable chunks.

**Alternatives considered:**

- _Big-bang conversion_: Would ensure consistency from day one but creates a single massive PR that is hard to review and test. Risk of breaking existing commands is high.
- _Stay in JavaScript with JSDoc types_: Provides some type checking but no compile-time safety, no interface definitions for API responses, and diverges further from the TypeScript codebase.

### 2. Standardize on @inquirer/prompts for all interactive input

All interactive prompts will use `@inquirer/prompts` (already a dependency). The `readline.createInterface` usage in `character.js` and raw `process.stdin` reads in `organization.js` will be replaced with `input()`, `select()`, and `confirm()` from `@inquirer/prompts`.

**Why:** `@inquirer/prompts` is already the declared dependency and used in `campaign.js`. It provides a consistent UX (cursor handling, validation, defaults), handles edge cases (Ctrl+C, piped input), and has TypeScript types. Using three different prompt mechanisms creates inconsistent behavior and maintenance burden.

**Alternatives considered:**

- _Switch entirely to non-interactive flags_: Would remove the need for any prompt library but degrades UX for create/edit operations where interactive selection is valuable.
- _Use `enquirer` or `prompts`_: Different libraries with similar features. No benefit over `@inquirer/prompts` which is already installed.

### 3. Command grouping: one file per domain, subcommands via Commander

Each new domain gets a single command file (e.g., `map.ts`, `quest.ts`, `calendar.ts`) that exports a `make*Command()` function returning a Commander `Command` with subcommands (`list`, `get`, `create`, `update`, `delete`, plus domain-specific actions). This matches the existing pattern used by `campaign.js`, `character.js`, etc.

**Why:** Consistent with the existing codebase pattern. One file per domain keeps related logic together. Commander's `.command()` nesting provides natural `aleph map list`, `aleph map upload` syntax.

**Alternatives considered:**

- _Flat command files (one per action)_: `map-list.ts`, `map-create.ts`, etc. Creates many small files and loses the grouping context.
- _Nested directory per domain_: `commands/map/list.ts`, `commands/map/create.ts`. Adds directory depth without benefit since most command files are < 200 lines.

### 4. Priority order: maps and quests first, then economy, then remaining

Implementation order:

1. TypeScript setup + prompt standardization (foundation)
2. Maps commands (high DM value -- visual content management)
3. Quests commands (core campaign tracking)
4. Calendar/timeline commands (session planning)
5. Economy commands (items, shops, currencies, transactions, inventories)
6. Templates, tags, arcs, chapters (lower frequency operations)
7. Health check (utility)

**Why:** Maps and quests are the most frequently used features that currently lack CLI support. Economy commands are complex (5 interconnected domains) so they benefit from the patterns established by simpler commands. Templates, tags, arcs, and chapters are used less frequently and can be added last.

**Alternatives considered:**

- _Alphabetical order_: No prioritization means high-value commands might ship last.
- _Economy first_: More complex, higher risk of design churn before patterns are established.

### 5. TypeScript build pipeline: tsx for dev, tsc for dist

During development, commands are run via `tsx` (TypeScript executor). For distribution (`npm publish` / `npx aleph-cli`), `tsc` compiles to JavaScript in `cli/dist/`. The `bin/aleph.js` entry point will import from `dist/` in production or use `tsx` registration in development.

**Why:** `tsx` provides instant feedback during development without a watch/build step. `tsc` output in `dist/` ensures the published package works without TypeScript dependencies. This is the standard pattern for TypeScript CLI tools.

**Alternatives considered:**

- _`tsc --watch` only_: Requires a build step even during development, slowing iteration.
- _Bundle with esbuild/rollup_: Overkill for a CLI tool that runs on Node.js. `tsc` output is sufficient and preserves readable source maps.
- _Ship TypeScript with `tsx` as runtime dependency_: Adds ~15MB to install size for end users. Unacceptable for a CLI tool.

### 6. Map upload uses multipart form data via existing postMultipart helper

The `map upload` command will use the existing `postMultipart()` function in `client.js` (already used by character portrait upload) to send the map image file to `POST /api/campaigns/:id/maps/:slug/upload`.

**Why:** The helper already exists and handles `FormData` construction, file streaming, and auth headers. No new HTTP infrastructure needed.

## Risks / Trade-offs

- **Incremental migration creates a mixed JS/TS period**: During migration, some files are `.js` and some are `.ts`. The `tsconfig.json` must allow JS imports. This is temporary but adds complexity to the build.
- **Test coverage for 25+ new commands**: Each command needs at least integration tests against a running server. Test setup/teardown for economy commands (create currency, create item, create shop, stock shop, buy item) requires careful ordering. Shared test fixtures per domain will help.
- **Large PR scope**: Even split into groups, the full expansion touches many files. Breaking into multiple PRs (one per task group) is recommended but increases merge coordination.
- **API endpoint assumptions**: Some endpoints may have undocumented behaviors or edge cases not visible from the route file names. Integration tests will surface these.
