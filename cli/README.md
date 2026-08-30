# `aleph` CLI

The Node.js client for the Aleph HTTP API — one command group per domain, built on Commander.
It is a pure API client: everything it can do, the server already exposes, and nothing it does is
implemented locally.

- **Full guide** (auth, config, layout, conventions): [`../docs/cli.md`](../docs/cli.md)
- **Exhaustive command reference** (every command, every flag, one line each):
  [`../docs/claude-skill.md`](../docs/claude-skill.md)

This file deliberately carries **no command list**. Three documents already describe the surface
and must be updated together (`docs/cli.md` says how and why); a fourth copy would be a fourth
thing to forget.

## Running it

```bash
npm run aleph <command> …          # from the repo root
node cli/bin/aleph.js <command> …  # equivalent, no npm indirection
```

`cli/node_modules` is **gitignored and not vendored**, so a fresh checkout fails with
`ERR_MODULE_NOT_FOUND: commander` until you run `npm install --legacy-peer-deps --prefix cli`
once. CI does exactly that before the unit job, because any test that imports `cli/src/**` dies
without it.

## Endpoint parity

Adding or changing a server endpoint means adding or changing the command that drives it, in the
same change. Two rules this CLI has been bitten by and now keeps:

- **A flag that is accepted and silently does nothing is a defect, not a convenience.** Refuse it
  with a non-zero exit and a message naming what is missing — before any request is sent, so a
  refusal writes nothing.
- **A whole-list `PUT` needs a read-modify-write here.** `session xp --character X --xp N` reads
  the session's current awards, applies one change and writes the whole list back; sending only
  `X` would silently delete every other character's award. Anything else that replaces a
  collection server-side owes its single-item CLI form the same treatment.

## Tests

The CLI's unit coverage lives with the app's, under `tests/unit/cli/`. The suites worth copying
run the real Commander action against a mocked `fetch` and assert the request that would have
gone out (`tests/unit/cli/session-xp.test.ts`, `map-create.test.ts`) — a source-string assertion
cannot see a wrong request body.

```bash
npx vitest run tests/unit/cli/        # from the repo root
```
