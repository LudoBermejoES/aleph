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
