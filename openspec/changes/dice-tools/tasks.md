# Tasks: Dice & Tools

## 1. Dice Formula Parser

- [ ] 1.1 Implement tokenizer for dice notation (numbers, 'd', operators, modifiers)
- [ ] 1.2 Implement recursive descent parser producing DiceExpression AST
- [ ] 1.3 Support standard notation: NdX, NdX+M, NdX-M
- [ ] 1.4 Support keep highest/lowest: NdXkhN, NdXklN
- [ ] 1.5 Support exploding dice: NdX!
- [ ] 1.6 Support d% alias for d100
- [ ] 1.7 Add input validation with descriptive error messages
- [ ] 1.8 Write unit tests for parser with edge cases

## 2. Dice Evaluator

- [ ] 2.1 Implement evaluator that walks the DiceExpression AST
- [ ] 2.2 Use crypto.getRandomValues() for fair random number generation
- [ ] 2.3 Implement exploding dice with 100-reroll cap
- [ ] 2.4 Implement keep highest/lowest with kept/dropped tracking
- [ ] 2.5 Return structured RollResult with individual die values and total
- [ ] 2.6 Write unit tests for evaluator (mock RNG for deterministic tests)

## 3. Roll Logging

- [ ] 3.1 Create `session_rolls` schema with formula, result JSON, user, character
- [ ] 3.2 Generate and apply migration
- [ ] 3.3 Implement server roll endpoint (validate formula, evaluate, store if logging enabled)
- [ ] 3.4 Implement session roll history query endpoint

## 4. WebSocket Broadcasting

- [ ] 4.1 Implement dice:roll message type on the campaign WebSocket
- [ ] 4.2 Broadcast roll results to all connected campaign members
- [ ] 4.3 Handle broadcasting gracefully when WebSocket is not available (degrade to local-only)

## 5. Dice Roller UI

- [ ] 5.1 Create `DiceRoller.vue` floating panel component
- [ ] 5.2 Build quick-roll buttons for standard dice (d4, d6, d8, d10, d12, d20, d100)
- [ ] 5.3 Build formula text input with submit on Enter
- [ ] 5.4 Build modifier +/- controls and manual modifier input
- [ ] 5.5 Build result display with total and expandable individual die values
- [ ] 5.6 Build roll log feed showing own and broadcast rolls (last 50)
- [ ] 5.7 Add "Log to session" toggle (enabled only when session is active)
- [ ] 5.8 Add panel toggle button to campaign toolbar
- [ ] 5.9 Make panel draggable and collapsible

## 6. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 6.1 Test dice formula parser: "2d6+4" produces AST with roll(2,6) + constant(4)
- [ ] 6.2 Test dice formula parser: "4d6kh3" produces AST with roll(4,6) + keep_highest(3)
- [ ] 6.3 Test dice formula parser: "2d10!" produces AST with roll(2,10) + exploding flag
- [ ] 6.4 Test dice formula parser: "d%" parses as d100
- [ ] 6.5 Test dice formula parser: invalid input "2dd6" or "abc" returns descriptive parse error
- [ ] 6.6 Test dice evaluator: mock RNG to return known values; verify 2d6+4 with rolls [3,5] produces total 12
- [ ] 6.7 Test dice evaluator: mock RNG for 4d6kh3 with rolls [1,4,3,6]; verify kept=[4,3,6], dropped=[1], total=13
- [ ] 6.8 Test dice evaluator: exploding dice with mock RNG returning [6,6,3] produces 3 rolls total, sum=15
- [ ] 6.9 Test dice evaluator: exploding dice respects 100-reroll cap (does not infinite loop)
- [ ] 6.10 Test roll result bounds: NdX result is always between N and N*X (fuzz test with 100 random rolls)
- [ ] 6.11 Test RollResult structure: contains individual die values array, kept/dropped arrays (for kh/kl), and total

### Integration Tests (@nuxt/test-utils)

- [ ] 6.12 Test server roll endpoint: POST with valid formula returns structured RollResult with correct fields
- [ ] 6.13 Test server roll endpoint: POST with invalid formula returns 400 with parse error message
- [ ] 6.14 Test roll logging: POST roll with session_id stores roll in session_rolls table; GET history returns it
- [ ] 6.15 Test roll logging disabled: POST roll without session_id does not create session_rolls record

### WebSocket Tests

- [ ] 6.16 Test dice:roll broadcast: user rolls dice; all other connected campaign members receive broadcast with roll result
- [ ] 6.17 Test broadcast degradation: when WebSocket is unavailable, roll still succeeds locally without error

### Component Tests (@vue/test-utils)

- [ ] 6.18 Test DiceRoller component: quick-roll button click triggers roll and displays result with total and individual values
- [ ] 6.19 Test formula input: submitting formula via Enter key triggers roll; invalid formula displays error message
- [ ] 6.20 Test roll log feed: displays recent rolls in chronological order with user attribution
