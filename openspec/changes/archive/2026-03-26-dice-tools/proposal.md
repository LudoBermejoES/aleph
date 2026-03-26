# Proposal: Dice & Tools

## Why

Dice rolling is a fundamental TTRPG action that currently requires external tools or physical dice. Embedding a dice roller directly in Aleph keeps players in the campaign manager during play, provides a shared roll log visible to all participants, and enables formula-based rolling for complex mechanics like "4d6 keep highest 3" without manual math.

## What Changes

- Build a dice roller supporting standard dice (d4, d6, d8, d10, d12, d20, d100) and custom-sided dice
- Implement a dice formula parser for expressions like "2d6+4", "4d6kh3", exploding dice
- Support rolling multiple dice simultaneously
- Add modifier controls (manual entry and +/- increment buttons)
- Implement optional roll logging to the active session
- Broadcast dice rolls via WebSocket so all campaign members see results in real time
- Build a dice roller UI component accessible from any campaign page

## Scope

### In scope
- Standard dice types: d4, d6, d8, d10, d12, d20, d100
- Custom dice with arbitrary side count
- Formula parser: `NdX`, `NdX+M`, `NdXkh/klN` (keep highest/lowest), `NdX!` (exploding)
- Multi-dice rolls in a single action
- Modifier input (manual number or +/- buttons)
- Roll result display with individual die values and total
- Optional logging of rolls to current session (stored in `session_rolls` table)
- WebSocket broadcast of roll results to all campaign members
- Persistent dice roller panel accessible from any campaign page (floating or sidebar)

### Out of scope
- 3D dice animation
- Character sheet integration (auto-pulling stat modifiers)
- Macro system for saved roll formulas (future)
- Dice roll statistics/history analytics

## Dependencies
- 01-project-setup
- 02-auth-rbac
