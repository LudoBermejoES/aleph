import { Command } from 'commander'
import { get, post, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeTagCommand() {
  const cmd = new Command('tag').description('Manage campaign tags')

  cmd
    .command('list')
    .description('List tags in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/tags`)
      print(opts.json ? data : data.map(t => ({ id: t.id, name: t.name, color: t.color || '' })), { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a tag')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Tag name')
    .option('--color <hex>', 'Tag color (hex, e.g. #ff0000)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.color !== undefined) body.color = opts.color
      const data = await post(`/api/campaigns/${opts.campaign}/tags`, body)
      if (opts.json) { print(data, { json: true }) } else { success(`Tag created: ${data.name} (${data.id})`) }
    })

  cmd
    .command('delete')
    .description('Delete a tag')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <tagId>', 'Tag ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete tag ${opts.id}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/tags/${opts.id}`)
      success(`Tag ${opts.id} deleted.`)
    })

  return cmd
}
