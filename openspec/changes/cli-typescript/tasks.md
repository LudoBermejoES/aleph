# Tasks: CLI TypeScript Migration

## 1. TypeScript Tooling Setup

- [ ] 1.1 Add `typescript`, `@types/node`, and `tsx` as devDependencies in `cli/package.json`
- [ ] 1.2 Create `cli/tsconfig.json` with `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `outDir: dist`, `rootDir: src`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`
- [ ] 1.3 Add `build` script (`tsc`) and `dev` script (`tsx src/index.ts`) to `cli/package.json`
- [ ] 1.4 Add `cli/dist/` to `.gitignore`

## 2. Convert Lib Layer

- [ ] 2.1 Convert `cli/src/lib/config.js` → `config.ts`: add `AlephConfig` interface with `url`, `apiKey`, `apiKeyId` string fields; type `requireConfig()`, `loadConfig()`, `saveConfig()` return/param types
- [ ] 2.2 Convert `cli/src/lib/client.js` → `client.ts`: add generic `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `del<T>()`, `postMultipart<T>()` typed helpers; type the internal `request()` function
- [ ] 2.3 Convert `cli/src/lib/output.js` → `output.ts`: type `print(data: unknown, opts?: { json?: boolean })` and `success(msg: string): void`
- [ ] 2.4 Verify lib layer compiles: `cd cli && npx tsc --noEmit`

## 3. Standardize Prompts (cleanup before TS conversion)

- [ ] 3.1 Replace `readline.createInterface` in `character.js` `connection-delete` subcommand with `confirm()` from `@inquirer/prompts` (consistent with other delete commands)
- [ ] 3.2 Review `organization.js` for raw `process.stdin` usage and replace with `@inquirer/prompts` where applicable

## 4. Convert Command Files

- [ ] 4.1 Convert `cli/src/commands/login.js` → `login.ts`
- [ ] 4.2 Convert `cli/src/commands/logout.js` → `logout.ts`
- [ ] 4.3 Convert `cli/src/commands/config.js` → `config.ts`
- [ ] 4.4 Convert `cli/src/commands/campaign.js` → `campaign.ts`
- [ ] 4.5 Convert `cli/src/commands/entity.js` → `entity.ts`
- [ ] 4.6 Convert `cli/src/commands/character.js` → `character.ts`
- [ ] 4.7 Convert `cli/src/commands/organization.js` → `organization.ts`
- [ ] 4.8 Convert `cli/src/commands/location.js` → `location.ts`
- [ ] 4.9 Convert `cli/src/commands/session.js` → `session.ts`
- [ ] 4.10 Convert `cli/src/commands/session-group.js` → `session-group.ts`
- [ ] 4.11 Convert `cli/src/commands/member.js` → `member.ts`
- [ ] 4.12 Convert `cli/src/commands/relation.js` → `relation.ts`
- [ ] 4.13 Convert `cli/src/commands/search.js` → `search.ts`
- [ ] 4.14 Convert `cli/src/commands/roll.js` → `roll.ts`
- [ ] 4.15 Convert `cli/src/commands/import-arcadia.js` → `import-arcadia.ts`
- [ ] 4.16 Convert `cli/src/commands/map.js` → `map.ts`
- [ ] 4.17 Convert `cli/src/commands/quest.js` → `quest.ts`
- [ ] 4.18 Convert `cli/src/commands/calendar.js` → `calendar.ts`
- [ ] 4.19 Convert `cli/src/commands/timeline.js` → `timeline.ts`
- [ ] 4.20 Convert `cli/src/commands/item.js` → `item.ts`
- [ ] 4.21 Convert `cli/src/commands/shop.js` → `shop.ts`
- [ ] 4.22 Convert `cli/src/commands/currency.js` → `currency.ts`
- [ ] 4.23 Convert `cli/src/commands/transaction.js` → `transaction.ts`
- [ ] 4.24 Convert `cli/src/commands/inventory.js` → `inventory.ts`
- [ ] 4.25 Convert `cli/src/commands/template.js` → `template.ts`
- [ ] 4.26 Convert `cli/src/commands/tag.js` → `tag.ts`
- [ ] 4.27 Convert `cli/src/commands/arc.js` → `arc.ts`
- [ ] 4.28 Convert `cli/src/commands/chapter.js` → `chapter.ts`
- [ ] 4.29 Convert `cli/src/commands/health.js` → `health.ts`

## 5. Convert Entry Point

- [ ] 5.1 Convert `cli/src/index.js` → `index.ts`: update all imports to `.js` extension (required by NodeNext)
- [ ] 5.2 Update `cli/bin/aleph.js` to import from `dist/index.js` instead of `src/index.js`

## 6. Build & Verify

- [ ] 6.1 Run `cd cli && npm run build` — TypeScript compiles without errors
- [ ] 6.2 Run `node cli/bin/aleph.js --help` — all 29+ commands listed
- [ ] 6.3 Spot-check 3 commands against the configured server: `aleph health`, `aleph campaign list --json`, `aleph character list --campaign <id> --json`
- [ ] 6.4 Run `npx vitest run tests/unit/` — all pass
- [ ] 6.5 Run `npx vitest run tests/integration/` — all pass (server on port 3333)
