import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeShopCommand() {
  const cmd = new Command('shop').description('Manage campaign shops')

  cmd
    .command('list')
    .description('List shops in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/shops`)
      print(opts.json ? data : data.map(s => ({ name: s.name, slug: s.slug })), { json: opts.json })
    })

  cmd
    .command('get')
    .description('Show shop details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/shops/${opts.slug}`)
      print(data, { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Shop name')
    .option('--description <desc>', 'Shop description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/shops`, { name: opts.name, description: opts.description })
      if (opts.json) { print(data, { json: true }) } else { success(`Shop created: ${data.name} (${data.slug})`) }
    })

  cmd
    .command('update')
    .description('Update a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      await put(`/api/campaigns/${opts.campaign}/shops/${opts.slug}`, body)
      success('Shop updated.')
    })

  cmd
    .command('delete')
    .description('Delete a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete shop "${opts.slug}"? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/shops/${opts.slug}`)
      success(`Shop ${opts.slug} deleted.`)
    })

  cmd
    .command('stock')
    .description('Add stock to a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .requiredOption('--item <itemId>', 'Item ID')
    .requiredOption('--quantity <n>', 'Quantity', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/shops/${opts.slug}/stock`, { itemId: opts.item, quantity: opts.quantity })
      if (opts.json) { print(data, { json: true }) } else { success('Stock updated.') }
    })

  cmd
    .command('buy')
    .description('Buy an item from a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .requiredOption('--item <itemId>', 'Item ID')
    .requiredOption('--quantity <n>', 'Quantity', parseInt)
    .requiredOption('--buyer <inventoryId>', 'Buyer inventory ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/shops/${opts.slug}/buy`, {
        itemId: opts.item, quantity: opts.quantity, buyerInventoryId: opts.buyer,
      })
      if (opts.json) { print(data, { json: true }) } else { success('Purchase complete.') }
    })

  cmd
    .command('sell')
    .description('Sell an item to a shop')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .requiredOption('--item <itemId>', 'Item ID')
    .requiredOption('--quantity <n>', 'Quantity', parseInt)
    .requiredOption('--seller <inventoryId>', 'Seller inventory ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/shops/${opts.slug}/sell`, {
        itemId: opts.item, quantity: opts.quantity, sellerInventoryId: opts.seller,
      })
      if (opts.json) { print(data, { json: true }) } else { success('Sale complete.') }
    })

  cmd
    .command('till')
    .description('Show shop till (currency balance)')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/shops/${opts.slug}/till`)
      print(data, { json: opts.json })
    })

  cmd
    .command('withdraw')
    .description('Withdraw currency from shop till')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Shop slug')
    .requiredOption('--amounts <json>', 'Amounts as JSON (e.g. \'{"gp":10}\')')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/shops/${opts.slug}/withdraw`, { amounts: JSON.parse(opts.amounts) })
      if (opts.json) { print(data, { json: true }) } else { success('Withdrawal complete.') }
    })

  return cmd
}
