import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeCurrencyCommand() {
  const cmd = new Command('currency').description('Manage campaign currencies')

  cmd
    .command('list')
    .description('List currencies in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/currencies`)
      print(
        opts.json
          ? data
          : data.map((c) => ({
              id: c.id,
              name: c.name,
              symbol: c.symbol,
              value: c.valueInBaseUnits,
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create a currency')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Currency name')
    .requiredOption('--symbol <symbol>', 'Currency symbol (e.g. gp)')
    .requiredOption('--value <n>', 'Value in base units', parseFloat)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/currencies`, {
        name: opts.name,
        symbol: opts.symbol,
        valueInBaseUnits: opts.value,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Currency created: ${data.name} (${data.symbol})`)
      }
    })

  cmd
    .command('update')
    .description('Update a currency')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <currencyId>', 'Currency ID')
    .option('--name <name>', 'New name')
    .option('--symbol <symbol>', 'New symbol')
    .option('--value <n>', 'New value in base units', parseFloat)
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.symbol !== undefined) body.symbol = opts.symbol
      if (opts.value !== undefined) body.valueInBaseUnits = opts.value
      await put(`/api/campaigns/${opts.campaign}/currencies/${opts.id}`, body)
      success('Currency updated.')
    })

  cmd
    .command('delete')
    .description('Delete a currency')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <currencyId>', 'Currency ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete currency ${opts.id}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/currencies/${opts.id}`)
      success(`Currency ${opts.id} deleted.`)
    })

  cmd
    .command('convert')
    .description('Convert between currencies')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--amount <n>', 'Amount to convert', parseFloat)
    .requiredOption('--from <symbol>', 'Source currency symbol')
    .requiredOption('--to <symbol>', 'Target currency symbol')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(
        `/api/campaigns/${opts.campaign}/currencies/convert?amount=${opts.amount}&from=${encodeURIComponent(opts.from)}&to=${encodeURIComponent(opts.to)}`,
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data)
      }
    })

  return cmd
}
