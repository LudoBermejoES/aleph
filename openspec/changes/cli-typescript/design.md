# Design: CLI TypeScript Migration

## Approach

Full conversion — all `.js` files in `cli/src/` become `.ts`. No incremental hybrid approach needed since the codebase is small and consistent.

## Build Pipeline

```
cli/src/**/*.ts  →  tsc  →  cli/dist/**/*.js
                              ↑
              cli/bin/aleph.js imports from here
```

`cli/bin/aleph.js` remains plain JS (it's the entry shim) and imports from `dist/index.js`.

For development, `tsx` can run `src/index.ts` directly without a compile step.

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`allowJs` is NOT needed — we're doing a full conversion.

## Typed Lib Layer

### `config.ts`
```ts
export interface AlephConfig {
  url: string
  apiKey: string
  apiKeyId: string
}
export function requireConfig(): AlephConfig
export function loadConfig(): AlephConfig | null
export function saveConfig(cfg: AlephConfig): void
```

### `client.ts`
```ts
export async function get<T = unknown>(path: string): Promise<T>
export async function post<T = unknown>(path: string, body: unknown): Promise<T>
export async function put<T = unknown>(path: string, body: unknown): Promise<T>
export async function patch<T = unknown>(path: string, body: unknown): Promise<T>
export async function del<T = unknown>(path: string): Promise<T>
export async function postMultipart<T = unknown>(path: string, filePath: string, fieldName: string): Promise<T>
```

### `output.ts`
```ts
export function print(data: unknown, opts?: { json?: boolean }): void
export function success(msg: string): void
```

## Command Files

Each command file exports a `make*Command()` function returning `Command`. Type annotations are added to `opts` objects using inline types derived from Commander's option parsing. No need for a shared options type — keep each command self-contained.

## `.js` Imports in TypeScript

Since `"module": "NodeNext"`, imports still use `.js` extension in source:
```ts
import { get, post } from '../lib/client.js'  // correct for NodeNext
```

## `cli/bin/aleph.js` Update

```js
import('../dist/index.js').catch(err => {
  process.stderr.write(`Error: ${err.message}\n`)
  process.exit(1)
})
```

Or simply:
```js
import { createRequire } from 'module'
// keep as: import the compiled dist
```

The simplest approach: just change the import path from `../src/index.js` to `../dist/index.js`.

## Prompt Standardization (bundled with this change)

`character.js` uses `readline.createInterface` for `connection-delete`. `organization.js` reads `process.stdin` for multi-line input. These are converted to `@inquirer/prompts` during the TypeScript migration — a natural cleanup to do at the same time.
