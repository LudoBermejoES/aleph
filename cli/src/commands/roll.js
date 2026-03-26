import { Command } from 'commander'
import { post } from '../lib/client.js'
import { getConfig } from '../lib/config.js'
import { print } from '../lib/output.js'

/** Simple local dice roller for offline use */
function rollLocal(formula) {
  const rolls = []
  let total = 0
  // Parse NdM+K or NdM-K
  const re = /(\d+)d(\d+)([+-]\d+)?/gi
  let match
  const cleaned = formula.replace(/\s/g, '')
  while ((match = re.exec(cleaned)) !== null) {
    const count = parseInt(match[1])
    const sides = parseInt(match[2])
    const mod = match[3] ? parseInt(match[3]) : 0
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1
      rolls.push(r)
      total += r
    }
    total += mod
  }
  if (!rolls.length) {
    // Plain number
    const n = parseInt(cleaned)
    if (!isNaN(n)) { total = n; rolls.push(n) }
  }
  return { formula, rolls, total }
}

export function makeRollCommand() {
  return new Command('roll')
    .description('Roll dice (e.g. 2d6+3)')
    .argument('<formula>', 'Dice formula')
    .option('--campaign <id>', 'Campaign ID (records roll in campaign history)')
    .option('--json', 'Output as JSON')
    .action(async (formula, opts) => {
      let result
      const config = getConfig()
      if (opts.campaign && config.token && config.url) {
        result = await post(`/api/campaigns/${opts.campaign}/roll`, { formula })
      } else {
        result = rollLocal(formula)
      }
      if (opts.json) {
        print(result, { json: true })
      } else {
        console.log(`🎲 ${result.formula} → [${result.rolls.join(', ')}] = ${result.total}`)
      }
    })
}
