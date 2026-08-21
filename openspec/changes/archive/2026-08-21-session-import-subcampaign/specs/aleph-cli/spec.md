## ADDED Requirements

### Requirement: Session import SHALL accept a sub-campaign and report the resulting placement

`aleph session import` SHALL accept `--subcampaign <slug>`, with `--group <slug>` as a deprecated
alias, matching `session list`, `session create` and `session update`. When the import creates a
session it SHALL pass the slug through as `subCampaignSlug`; when it finds an existing session and a
sub-campaign is given, it SHALL move that session to it. The command SHALL print the resulting
sub-campaign.

**The defect this closes is silence, not absence.** Without the flag, every imported session is
created in the campaign's DEFAULT sub-campaign, the import prints success, and the session exists —
attached to the wrong storyline. In `Berlin en tinieblas` a session of _La discoteca_ (six mortal
students) lands in _La capilla_ (the mage cabal), two casts that share nothing. Nothing errors, so
correctness depends entirely on remembering a second command afterwards.

The asymmetry is the evidence: `session create` already accepts `--subcampaign` and posts
`subCampaignSlug` to the same endpoint the import uses, so the capability exists everywhere except
the one path that is used for bulk work.

#### Scenario: Import creates a session into a named sub-campaign

- **WHEN** `session import --subcampaign <slug>` creates a new session
- **THEN** the session SHALL be created in that sub-campaign
- **AND** the command SHALL print the sub-campaign it used

#### Scenario: Import moves an existing session

- **WHEN** `session import --subcampaign <slug>` finds an existing session for that date, in a
  different sub-campaign
- **THEN** the session SHALL be moved to the named sub-campaign
- **AND** the move SHALL be reported in the output

#### Scenario: No sub-campaign given

- **WHEN** `session import` is run without `--subcampaign` or `--group`
- **THEN** the session SHALL be created in the campaign's default sub-campaign, as before
- **AND** the command SHALL still print which sub-campaign it landed in, so a default placement is
  visible rather than assumed

#### Scenario: The deprecated alias behaves identically

- **WHEN** `--group <slug>` is used instead of `--subcampaign <slug>`
- **THEN** the behaviour SHALL be identical, matching the alias handling of the sibling subcommands
