# Proposal: Migrate aleph-cli from JavaScript to TypeScript

## Problem

The `cli/` directory is currently plain JavaScript (ESM). As the CLI grows (29 commands, ~15 source files), the lack of types makes it harder to:

- Catch mistakes (wrong option names, wrong API body shape) at compile time rather than at runtime
- Refactor confidently (renaming fields across commands, changing client function signatures)
- Document intent (what does `opts` contain? what shape does the API return?)

## What We're Changing

Convert all CLI source files from `.js` to `.ts`:

- `cli/src/lib/config.js` → `config.ts` (add `AlephConfig` interface)
- `cli/src/lib/client.js` → `client.ts` (add generic typed request helpers)
- `cli/src/lib/output.js` → `output.ts` (add typed `print()` and `success()`)
- `cli/src/commands/*.js` → `*.ts` (all 29 command files)
- `cli/src/index.js` → `index.ts`

Add TypeScript build tooling:

- `typescript` + `@types/node` as devDependencies
- `tsconfig.json` with `NodeNext` module resolution, `outDir: dist`
- `build` script (`tsc`) and `dev` script (`tsx src/index.ts`)
- Update `cli/bin/aleph.js` to import from `dist/` (compiled output)

## Impact

- **CLI only** — no server API, no frontend, no DB schema changes
- The CLI's public interface (command names, options, output format) does not change
- `aleph-cli` skill files do not need updating (commands unchanged)
- All existing functionality preserved; TypeScript is compile-time only

## Why Now

The cli-expansion change just added 14 new command files (~1000 lines of new JS). This is the right moment to convert before the codebase grows further. With `allowJs: true` we can migrate incrementally if needed, but a full conversion is straightforward given the consistent patterns across all files.
