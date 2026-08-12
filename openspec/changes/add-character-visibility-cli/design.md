## Context

Characters already have full visibility enforcement server-side (`enforce-entity-visibility`), and the organization CLI commands already have a working `--visibility` flag to model against. This is a narrow, single-file CLI change with an established pattern to copy — no new architecture, dependency, or migration involved.

## Goals / Non-Goals

**Goals:**

- `aleph character create --visibility <vis> ...` and `aleph character update <slug> --visibility <vis>` work exactly like their organization equivalents.
- `character list`/`character show` display `visibility` so a DM can audit it from the terminal without opening the web UI.

**Non-Goals:**

- No server, schema, or validation changes — the enum and enforcement already exist and were verified in `enforce-entity-visibility`.
- No `""`-to-clear semantics for `--visibility` (unlike e.g. `--gender`): visibility has no "cleared" state, only a defined enum value, so `update` requires a valid enum value when the flag is passed, same as `organization edit`.

## Decisions

- **Mirror `organization.js` exactly.** `cli/src/commands/organization.js`'s `create`/`edit` commands already have `.option('--visibility <vis>', 'Visibility (public, members, editors, dm_only, private, specific_users)')` and pass it straight through as `body.visibility`. Reusing the identical option string and pass-through keeps the two entity-type CLIs in lockstep rather than introducing a slightly different convention for characters.
- **No client-side enum validation.** The organization CLI doesn't validate the enum client-side either — it lets the server's Zod schema reject an invalid value with a normal API error. Keeping this consistent avoids the CLI's allowed values silently drifting out of sync with the server's if the enum ever changes.

## Risks / Trade-offs

- [Risk] The CLI's `--visibility` help text listing the enum values could drift from the server's actual enum if the enum changes later → Mitigation: this is a pre-existing risk shared with the organization CLI's identical flag, not new to this change; not solving it here keeps this change narrowly scoped.
