import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeCampaignCommand() {
  const cmd = new Command('campaign').description('Manage campaigns')

  cmd
    .command('list')
    .description('List all campaigns')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get('/api/campaigns')
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(c => ({ id: c.id, name: c.name, role: c.role, description: c.description || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a new campaign')
    .requiredOption('--name <name>', 'Campaign name')
    .option('--description <desc>', 'Campaign description')
    .option('--theme <theme>', 'Visual theme (e.g. dark-fantasy, cyberpunk)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post('/api/campaigns', {
        name: opts.name,
        description: opts.description,
        theme: opts.theme,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Campaign created: ${data.name} (${data.id})`)
      }
    })

  cmd
    .command('show <id>')
    .description('Show campaign details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      const data = await get(`/api/campaigns/${id}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({ id: data.id, name: data.name, description: data.description || '', theme: data.theme || 'default' })
      }
    })

  cmd
    .command('delete <id>')
    .description('Delete a campaign (requires confirmation)')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (id, opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete campaign ${id}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${id}`)
      success(`Campaign ${id} deleted.`)
    })

  return cmd
}
