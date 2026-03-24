// --- Types ---

export interface DiceExpression {
  type: 'roll' | 'constant' | 'add' | 'subtract'
  // Roll properties
  count?: number
  sides?: number
  keepHighest?: number
  keepLowest?: number
  exploding?: boolean
  // Constant
  value?: number
  // Binary operator
  left?: DiceExpression
  right?: DiceExpression
}

export interface DieRoll {
  sides: number
  values: number[]
  kept: number[]
  dropped: number[]
}

export interface RollResult {
  formula: string
  total: number
  rolls: DieRoll[]
}

export type RngFn = (min: number, max: number) => number

// --- Default RNG ---

function defaultRng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// --- Parser ---

export function parseDiceFormula(formula: string): DiceExpression {
  const input = formula.trim().toLowerCase()
  if (!input) throw new Error('Empty dice formula')

  const tokens = tokenize(input)
  if (tokens.length === 0) throw new Error('Invalid dice formula: no valid tokens')

  const { expr, pos } = parseExpression(tokens, 0)
  if (pos < tokens.length) throw new Error(`Unexpected token at position ${pos}: "${tokens[pos].value}"`)
  return expr
}

export function isValidFormula(formula: string): boolean {
  try {
    parseDiceFormula(formula)
    return true
  } catch {
    return false
  }
}

interface Token {
  type: 'number' | 'dice' | 'plus' | 'minus' | 'kh' | 'kl' | 'explode' | 'percent'
  value: string
  num?: number
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    if (input[i] === ' ') { i++; continue }

    if (input[i] === '+') { tokens.push({ type: 'plus', value: '+' }); i++; continue }
    if (input[i] === '-') { tokens.push({ type: 'minus', value: '-' }); i++; continue }
    if (input[i] === '!') { tokens.push({ type: 'explode', value: '!' }); i++; continue }
    if (input[i] === '%') { tokens.push({ type: 'percent', value: '%' }); i++; continue }

    if (input[i] === 'd') {
      tokens.push({ type: 'dice', value: 'd' })
      i++
      continue
    }

    if (input.substring(i, i + 2) === 'kh') {
      tokens.push({ type: 'kh', value: 'kh' })
      i += 2
      continue
    }

    if (input.substring(i, i + 2) === 'kl') {
      tokens.push({ type: 'kl', value: 'kl' })
      i += 2
      continue
    }

    if (/[0-9]/.test(input[i])) {
      let num = ''
      while (i < input.length && /[0-9]/.test(input[i])) {
        num += input[i]
        i++
      }
      tokens.push({ type: 'number', value: num, num: parseInt(num, 10) })
      continue
    }

    throw new Error(`Invalid character in dice formula: "${input[i]}"`)
  }

  return tokens
}

function parseExpression(tokens: Token[], pos: number): { expr: DiceExpression; pos: number } {
  let { expr: left, pos: p } = parsePrimary(tokens, pos)

  while (p < tokens.length && (tokens[p].type === 'plus' || tokens[p].type === 'minus')) {
    const op = tokens[p].type === 'plus' ? 'add' : 'subtract'
    p++
    const { expr: right, pos: np } = parsePrimary(tokens, p)
    left = { type: op as 'add' | 'subtract', left, right }
    p = np
  }

  return { expr: left, pos: p }
}

function parsePrimary(tokens: Token[], pos: number): { expr: DiceExpression; pos: number } {
  if (pos >= tokens.length) throw new Error('Unexpected end of dice formula')

  // Case: "d..." (implicit 1)
  if (tokens[pos].type === 'dice') {
    return parseDiceRoll(1, tokens, pos + 1)
  }

  // Case: number
  if (tokens[pos].type === 'number') {
    const num = tokens[pos].num!
    // Check if followed by 'd'
    if (pos + 1 < tokens.length && tokens[pos + 1].type === 'dice') {
      return parseDiceRoll(num, tokens, pos + 2)
    }
    // Plain constant
    return { expr: { type: 'constant', value: num }, pos: pos + 1 }
  }

  throw new Error(`Unexpected token: "${tokens[pos].value}"`)
}

function parseDiceRoll(count: number, tokens: Token[], pos: number): { expr: DiceExpression; pos: number } {
  let sides: number

  // d% = d100
  if (pos < tokens.length && tokens[pos].type === 'percent') {
    sides = 100
    pos++
  } else if (pos < tokens.length && tokens[pos].type === 'number') {
    sides = tokens[pos].num!
    pos++
  } else {
    throw new Error('Expected number or % after "d"')
  }

  const expr: DiceExpression = { type: 'roll', count, sides }

  // Check for modifiers: kh, kl, !
  while (pos < tokens.length) {
    if (tokens[pos].type === 'kh') {
      pos++
      if (pos < tokens.length && tokens[pos].type === 'number') {
        expr.keepHighest = tokens[pos].num!
        pos++
      } else {
        throw new Error('Expected number after "kh"')
      }
    } else if (tokens[pos].type === 'kl') {
      pos++
      if (pos < tokens.length && tokens[pos].type === 'number') {
        expr.keepLowest = tokens[pos].num!
        pos++
      } else {
        throw new Error('Expected number after "kl"')
      }
    } else if (tokens[pos].type === 'explode') {
      expr.exploding = true
      pos++
    } else {
      break
    }
  }

  return { expr, pos }
}

// --- Evaluator ---

const MAX_EXPLOSIONS = 100

export function evaluateDiceRoll(ast: DiceExpression, rng: RngFn = defaultRng): RollResult {
  const rolls: DieRoll[] = []
  const total = evaluate(ast, rng, rolls)
  // Reconstruct formula from AST
  const formula = astToFormula(ast)
  return { formula, total, rolls }
}

function evaluate(node: DiceExpression, rng: RngFn, rolls: DieRoll[]): number {
  switch (node.type) {
    case 'constant':
      return node.value ?? 0

    case 'roll': {
      const count = node.count ?? 1
      const sides = node.sides ?? 6
      const values: number[] = []

      for (let i = 0; i < count; i++) {
        let v = rng(1, sides)
        values.push(v)

        if (node.exploding) {
          let explosions = 0
          while (v === sides && explosions < MAX_EXPLOSIONS) {
            v = rng(1, sides)
            values.push(v)
            explosions++
          }
        }
      }

      let kept: number[]
      let dropped: number[] = []

      if (node.keepHighest) {
        const sorted = [...values].sort((a, b) => b - a)
        kept = sorted.slice(0, node.keepHighest)
        dropped = sorted.slice(node.keepHighest)
      } else if (node.keepLowest) {
        const sorted = [...values].sort((a, b) => a - b)
        kept = sorted.slice(0, node.keepLowest)
        dropped = sorted.slice(node.keepLowest)
      } else {
        kept = [...values]
      }

      rolls.push({ sides, values, kept, dropped })
      return kept.reduce((sum, v) => sum + v, 0)
    }

    case 'add':
      return evaluate(node.left!, rng, rolls) + evaluate(node.right!, rng, rolls)

    case 'subtract':
      return evaluate(node.left!, rng, rolls) - evaluate(node.right!, rng, rolls)

    default:
      return 0
  }
}

function astToFormula(node: DiceExpression): string {
  switch (node.type) {
    case 'constant':
      return String(node.value ?? 0)
    case 'roll': {
      let s = `${node.count ?? 1}d${node.sides ?? 6}`
      if (node.keepHighest) s += `kh${node.keepHighest}`
      if (node.keepLowest) s += `kl${node.keepLowest}`
      if (node.exploding) s += '!'
      return s
    }
    case 'add':
      return `${astToFormula(node.left!)}+${astToFormula(node.right!)}`
    case 'subtract':
      return `${astToFormula(node.left!)}-${astToFormula(node.right!)}`
    default:
      return ''
  }
}

// --- Formatter ---

export function formatRollResult(result: RollResult): string {
  const parts = result.rolls.map(r => {
    const vals = r.values.join(', ')
    if (r.dropped.length > 0) {
      return `[${r.kept.join('+')}] (dropped: ${r.dropped.join(', ')})`
    }
    return `[${vals}]`
  })
  return `${result.formula} = ${parts.join(' ')} = **${result.total}**`
}
