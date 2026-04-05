import { Command } from 'commander'
import { get, post, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeInventoryCommand() {
  const cmd = new Command('inventory').description('Manage campaign inventories')

  cmd
    .command('list')
    .description('List inventories in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/inventories`)
      print(
        opts.json
          ? data
          : data.map((i) => ({ id: i.id, ownerType: i.ownerType, ownerId: i.ownerId || '' })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create an inventory')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--owner-type <type>', 'Owner type (character|party|shop|faction)')
    .requiredOption('--owner-id <id>', 'Owner entity ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/inventories`, {
        ownerType: opts.ownerType,
        ownerId: opts.ownerId,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Inventory created: ${data.id}`)
      }
    })

  cmd
    .command('delete')
    .description('Delete an inventory')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <inventoryId>', 'Inventory ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete inventory ${opts.id}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/inventories/${opts.id}`)
      success(`Inventory ${opts.id} deleted.`)
    })

  cmd
    .command('add-item')
    .description('Add an item to an inventory')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--inventory <inventoryId>', 'Inventory ID')
    .requiredOption('--item <itemId>', 'Item ID')
    .requiredOption('--quantity <n>', 'Quantity', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(
        `/api/campaigns/${opts.campaign}/inventories/${opts.inventory}/items`,
        {
          itemId: opts.item,
          quantity: opts.quantity,
        },
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success('Item added to inventory.')
      }
    })

  cmd
    .command('item-delete')
    .description('Remove an item from an inventory')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--inventory <inventoryId>', 'Inventory ID')
    .requiredOption('--item <itemId>', 'Item ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Remove item ${opts.item} from inventory ${opts.inventory}?`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/inventories/${opts.inventory}/items/${opts.item}`)
      success('Item removed from inventory.')
    })

  cmd
    .command('transfer')
    .description('Transfer an item between inventories')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--from <inventoryId>', 'Source inventory ID')
    .requiredOption('--to <inventoryId>', 'Destination inventory ID')
    .requiredOption('--item <itemId>', 'Item ID')
    .requiredOption('--quantity <n>', 'Quantity', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/inventories/${opts.from}/transfer`, {
        toInventoryId: opts.to,
        itemId: opts.item,
        quantity: opts.quantity,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success('Transfer complete.')
      }
    })

  return cmd
}
