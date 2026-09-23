## ADDED Requirements

### Requirement: Chapter commands understand sub-campaigns

`aleph chapter list` SHALL accept `--subcampaign <slug>`, narrowing to chapters whose arc belongs to
that sub-campaign, and SHALL work with neither `--arc` nor `--subcampaign` given, listing the whole
campaign. Its output SHALL include a sub-campaign column.

#### Scenario: Listing a sub-campaign's chapters

- **WHEN** a Narrator runs `aleph chapter list --campaign <id> --subcampaign mortales`
- **THEN** only chapters whose arc is in `mortales` are listed, each showing its arc and sub-campaign

#### Scenario: Listing every chapter

- **WHEN** they run `aleph chapter list --campaign <id>` with no narrowing
- **THEN** every chapter of the campaign is listed

### Requirement: Arc and quest listings show the sub-campaign

`aleph arc list` and `aleph quest list` SHALL include a sub-campaign column, as `aleph session list`
already does. Filtering by a dimension the output never displays is the defect being closed.

#### Scenario: The arc listing shows the sub-campaign

- **WHEN** a Narrator runs `aleph arc list --campaign <id>`
- **THEN** each row names its sub-campaign

#### Scenario: A filtered listing is distinguishable from an unfiltered one

- **WHEN** they run the same command with `--subcampaign mortales`
- **THEN** every row shows `mortales`, making the applied filter evident from the output alone

### Requirement: Moving an arc reports the sessions it carried

`aleph arc update --subcampaign <slug>` SHALL report how many sessions moved with the arc, so a bulk
effect is never silent.

#### Scenario: The move reports its blast radius

- **WHEN** a Narrator moves an arc holding 12 sessions to another sub-campaign
- **THEN** the command reports that 12 sessions moved with it

#### Scenario: A no-op move says so

- **WHEN** they pass the arc's current sub-campaign
- **THEN** the command reports that nothing moved

### Requirement: A command audits and repairs cross-sub-campaign incoherence

`aleph sub-campaign audit --campaign <id>` SHALL report every session whose arc belongs to a
different sub-campaign, and SHALL NOT modify anything unless `--fix` is passed, in which case each
reported session adopts its arc's sub-campaign. It SHALL exit non-zero when it finds incoherence and
`--fix` was not given, so it can gate a script.

#### Scenario: The audit reports and changes nothing

- **GIVEN** 4 incoherent sessions
- **WHEN** a Narrator runs the audit without `--fix`
- **THEN** all 4 are listed with their session, their sub-campaign and their arc's sub-campaign
- **AND** nothing is modified
- **AND** the exit code is non-zero

#### Scenario: Repairing

- **WHEN** they re-run it with `--fix`
- **THEN** the 4 sessions adopt their arc's sub-campaign and a further run reports nothing and exits zero

### Requirement: Both skill files document the new surface together

`docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` SHALL both be updated in the same
change, carrying the same command surface, per the standing rule that the two never diverge.

#### Scenario: The two skill files agree

- **WHEN** the change is complete
- **THEN** both files document `chapter list --subcampaign`, the sub-campaign columns and `sub-campaign audit`
- **AND** neither describes a command the other omits
