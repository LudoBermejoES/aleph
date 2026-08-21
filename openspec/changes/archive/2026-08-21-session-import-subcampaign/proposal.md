## Why

`session import` cannot place a session in a sub-campaign, so **every** imported session lands in the
campaign's default one. In `Berlin en tinieblas` that means a session of _La discoteca_ — a separate
storyline with its own six mortal characters — is created inside _La capilla_, the mage cabal's line.

The failure is silent, which is what makes it worth fixing rather than documenting. The import
succeeds, prints `✓ Session import complete`, and the session exists; it is simply attached to the
wrong storyline. Nothing errors, so the only thing standing between a correct import and a wrong one
is remembering a second command afterwards. That happened on 2026-08-21: the session had to be moved
with `session update --subcampaign la-discoteca` as a follow-up step.

`session create` already accepts `--subcampaign` and posts `subCampaignSlug`, so the API supports it
and only the import path is missing it. The asymmetry is the whole defect.

## What Changes

- `session import` gains `--subcampaign <slug>`, with `--group <slug>` as the deprecated alias, exactly
  matching `session list`, `session create` and `session update`.
- When the import CREATES a session, the slug is passed through as `subCampaignSlug` in the same POST
  `session create` already uses.
- When the import FINDS an existing session and `--subcampaign` is given, the session is moved, so a
  re-import cannot leave a session stranded in the default line.
- The import prints the resulting sub-campaign, so a wrong placement is visible in the output instead
  of only in the UI.
- Both skill documents are updated together (`docs/claude-skill.md` and
  `.claude/skills/aleph-cli/SKILL.md`), as this repo's CLAUDE.md requires for any CLI surface change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aleph-cli`: ADDS a requirement that session import accepts a sub-campaign and reports the resulting
  placement, so an import cannot silently attach a session to the wrong storyline.

## Impact

- `cli/src/commands/session.js` — the `import` subcommand only.
- `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — both, together.
- `tests/unit/` — coverage for slug pass-through on create and the move-on-existing branch.
- No server, schema or migration change: `POST /api/campaigns/:id/sessions` already accepts
  `subCampaignSlug`, and `PATCH …/sessions/:slug` already moves a session.

**Not in scope**: the `--group` deprecation itself. The alias is kept for parity with the other three
subcommands; retiring it everywhere at once is its own change.
