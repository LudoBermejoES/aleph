# Tasks: Dice & Tools

## 1. Dice Service -- TDD (tests first, then implementation)

### 1a. Write unit tests for parser (RED phase)

- [ ] 1.1 Test parseDiceFormula: "2d6+4" produces AST with roll(2,6) + constant(4)
- [ ] 1.2 Test parseDiceFormula: "4d6kh3" produces AST with roll(4,6) + keep_highest(3)
- [ ] 1.3 Test parseDiceFormula: "2d10!" produces AST with roll(2,10) + exploding flag
- [ ] 1.4 Test parseDiceFormula: "d%" parses as d100
- [ ] 1.5 Test parseDiceFormula: invalid "2dd6" returns descriptive parse error
- [ ] 1.6 Test isValidFormula: valid formulas return true, invalid return false

### 1b. Write unit tests for evaluator (RED phase)

- [ ] 1.7 Test evaluateDiceRoll: mock RNG, 2d6+4 with rolls [3,5] produces total 12
- [ ] 1.8 Test evaluateDiceRoll: mock RNG, 4d6kh3 with rolls [1,4,3,6], kept=[4,3,6], total=13
- [ ] 1.9 Test evaluateDiceRoll: exploding dice mock RNG [6,6,3] produces 3 rolls, sum=15
- [ ] 1.10 Test evaluateDiceRoll: exploding dice respects 100-reroll cap
- [ ] 1.11 Test RollResult structure: individual values, kept/dropped arrays, total
- [ ] 1.12 Test roll bounds: NdX result always between N and N*X (fuzz 100 rolls)
- [ ] 1.13 Test formatRollResult: produces human-readable output

### 1c. Implement `server/services/dice.ts` (GREEN phase)

- [ ] 1.14 Implement parseDiceFormula: tokenizer + recursive descent parser
- [ ] 1.15 Support standard notation: NdX, NdX+M, NdX-M
- [ ] 1.16 Support keep highest/lowest: NdXkhN, NdXklN
- [ ] 1.17 Support exploding dice: NdX!
- [ ] 1.18 Support d% alias for d100
- [ ] 1.19 Implement evaluateDiceRoll with injectable RNG (default: crypto.getRandomValues)
- [ ] 1.20 Implement formatRollResult and isValidFormula
- [ ] 1.21 Verify all tests pass

## 2. Roll Logging

- [ ] 2.1 Create `session_rolls` schema with formula, result JSON, user, character
- [ ] 2.2 Generate and apply migration
- [ ] 2.3 Implement server roll endpoint: POST /api/campaigns/:id/roll (validate, evaluate, optionally log)
- [ ] 2.4 Implement roll history endpoint: GET /api/campaigns/:id/sessions/:slug/rolls

## 3. WebSocket Broadcasting

- [ ] 3.1 Implement dice:roll message type on campaign WebSocket
- [ ] 3.2 Broadcast roll results to all connected campaign members
- [ ] 3.3 Graceful degradation when WebSocket unavailable

## 4. Dice Roller UI

- [ ] 4.1 Create `DiceRoller.vue` floating panel component
- [ ] 4.2 Quick-roll buttons for standard dice (d4, d6, d8, d10, d12, d20, d100)
- [ ] 4.3 Formula text input with submit on Enter
- [ ] 4.4 Modifier +/- controls
- [ ] 4.5 Result display with total and expandable individual die values
- [ ] 4.6 Roll log feed (last 50, own + broadcast)
- [ ] 4.7 "Log to session" toggle
- [ ] 4.8 Panel toggle button in campaign toolbar

## 5. Integration Tests (API)

- [ ] 5.1 Test POST /api/campaigns/:id/roll with valid formula returns RollResult
- [ ] 5.2 Test POST /api/campaigns/:id/roll with invalid formula returns 400
- [ ] 5.3 Test roll logging: POST with session_id stores roll, GET history returns it
- [ ] 5.4 Test roll without session_id does not create log record

## 6. Component Tests

- [ ] 6.1 Test DiceRoller: quick-roll button triggers roll, displays result
- [ ] 6.2 Test formula input: Enter submits, invalid shows error
- [ ] 6.3 Test roll log feed: displays rolls in order
