import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeTransactionCommand() {
  const cmd = new Command('transaction').description('Manage campaign transactions')

  cmd
    .command('list')
    .description('List transactions in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/transactions`)
      print(opts.json ? data : data.map(t => ({ id: t.id, type: t.type, description: (t.description || '').slice(0, 40) })), { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a transaction')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--type <type>', 'Transaction type (purchase|sale|transfer|trade|deposit|withdrawal|grant)')
    .requiredOption('--amounts <json>', 'Amounts as JSON (e.g. \'{"gp":10}\')')
    .option('--from <entityId>', 'Source entity ID')
    .option('--to <entityId>', 'Destination entity ID')
    .option('--notes <text>', 'Notes')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/transactions`, {
        type: opts.type,
        amounts: JSON.parse(opts.amounts),
        fromEntityId: opts.from,
        toEntityId: opts.to,
        description: opts.notes,
      })
      if (opts.json) { print(data, { json: true }) } else { success(`Transaction created: ${data.id}`) }
    })

  cmd
    .command('update')
    .description('Update a transaction')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <txId>', 'Transaction ID')
    .option('--notes <text>', 'New notes/description')
    .option('--amounts <json>', 'New amounts as JSON')
    .action(async (opts) => {
      const body = {}
      if (opts.notes !== undefined) body.description = opts.notes
      if (opts.amounts !== undefined) body.amounts = JSON.parse(opts.amounts)
      await put(`/api/campaigns/${opts.campaign}/transactions/${opts.id}`, body)
      success('Transaction updated.')
    })

  cmd
    .command('delete')
    .description('Delete a transaction')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <txId>', 'Transaction ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete transaction ${opts.id}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/transactions/${opts.id}`)
      success(`Transaction ${opts.id} deleted.`)
    })

  return cmd
}
