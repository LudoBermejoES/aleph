# Design: Dice & Tools

## Technical Approach

### Dice Formula Parser

A recursive descent parser for dice notation:

**Grammar:**
```
expression  = term (('+' | '-') term)*
term        = dice | number
dice        = COUNT 'd' SIDES modifier*
modifier    = 'kh' NUMBER      # keep highest N
            | 'kl' NUMBER      # keep lowest N
            | '!'              # exploding (reroll on max)
            | 'r' NUMBER       # reroll if <= N
COUNT       = NUMBER | empty (defaults to 1)
SIDES       = NUMBER | '%' (alias for 100)
```

**Implementation:**
- Pure function: `parseDiceFormula(input: string) -> DiceExpression`
- `DiceExpression` is an AST with `{ type: 'roll' | 'constant', count, sides, modifiers, operator }`
- Parser returns structured AST; evaluator walks the AST to produce results
- Runs on both server (for validation) and client (for instant feedback)

### Dice Evaluator

- `evaluateDiceExpression(expr: DiceExpression) -> RollResult`
- Uses `crypto.getRandomValues()` for cryptographically random rolls (fair dice)
- `RollResult`: `{ formula, rolls: [{ sides, values: number[], kept: number[], dropped: number[] }], modifiers: number, total: number }`
- Exploding dice: if a die rolls its max value, add another roll (cap at 100 rerolls to prevent infinite loops)
- Keep highest/lowest: sort values, mark kept/dropped for display

### Roll Logging

- `session_rolls` table: `id, session_id, campaign_id, user_id, character_id (nullable), formula, result_json, note, created_at`
- `result_json` stores the full `RollResult` for replay/display
- Logging is opt-in: user toggles "Log to session" before rolling
- Only available when a session is active (status = 'active')

### WebSocket Broadcasting

- Rolls broadcast via the existing CrossWS WebSocket (change 12) or standalone if 12 is not yet implemented
- Message type: `dice:roll { userId, userName, formula, result, campaignId }`
- All connected campaign members receive the roll in real time
- Roll history kept in client memory (last 50 rolls) for the session duration

### Dice Roller UI Component

- `DiceRoller.vue`: floating panel toggled via a toolbar button (always accessible)
- Quick-roll buttons: d4, d6, d8, d10, d12, d20, d100 (single click = roll 1)
- Formula input: text field for typing expressions like "2d6+4"
- Modifier controls: +/- buttons and manual number input
- Result display: animated total with expandable individual die values
- Roll log feed: scrollable list of recent rolls (own + broadcast from others)
- Panel position: bottom-right floating panel, draggable, collapsible

### Service Layer (TDD)

Business logic extracted into `server/services/dice.ts` -- pure functions tested in isolation:

- `parseDiceFormula(formula)` -- tokenizes and parses dice notation into AST
- `evaluateDiceRoll(ast, rng?)` -- evaluates AST with optional mock RNG
- `formatRollResult(result)` -- formats result for display
- `isValidFormula(formula)` -- validates formula syntax

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API Endpoints

```
POST /api/campaigns/:id/dice/roll          # server-validated roll (returns result + broadcasts)
GET  /api/campaigns/:id/sessions/:sid/rolls # session roll history
```

Client-side rolling is also supported for instant feedback -- the server endpoint is used when logging or broadcasting is needed.
