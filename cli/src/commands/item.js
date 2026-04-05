import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeItemCommand() {
  const cmd = new Command('item').description('Manage campaign items')

  cmd
    .command('list')
    .description('List items in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/items`)
      print(
        opts.json
          ? data
          : data.map((i) => ({
              id: i.id,
              name: i.name,
              rarity: i.rarity || '',
              type: i.type || '',
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create an item')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Item name')
    .option('--description <desc>', 'Item description')
    .option('--price <json>', 'Price as JSON (e.g. \'{"gp":10}\')')
    .option('--rarity <rarity>', 'Rarity (common|uncommon|rare|very_rare|legendary)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.description) body.description = opts.description
      if (opts.price) body.priceJson = opts.price
      if (opts.rarity) body.rarity = opts.rarity
      const data = await post(`/api/campaigns/${opts.campaign}/items`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Item created: ${data.name} (${data.id})`)
      }
    })

  cmd
    .command('update')
    .description('Update an item')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <itemId>', 'Item ID')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--rarity <rarity>', 'New rarity')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      if (opts.rarity !== undefined) body.rarity = opts.rarity
      await put(`/api/campaigns/${opts.campaign}/items/${opts.id}`, body)
      success('Item updated.')
    })

  cmd
    .command('delete')
    .description('Delete an item')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <itemId>', 'Item ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete item ${opts.id}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/items/${opts.id}`)
      success(`Item ${opts.id} deleted.`)
    })

  return cmd
}
