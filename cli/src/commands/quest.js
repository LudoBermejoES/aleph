import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeQuestCommand() {
  const cmd = new Command('quest').description('Manage campaign quests')

  cmd
    .command('list')
    .description('List quests in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--status <status>', 'Filter by status (active|completed|failed|abandoned)')
    .option('--subcampaign <slug>', 'Filter by sub-campaign slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      if (opts.status) params.set('status', opts.status)
      if (opts.subcampaign) params.set('subCampaignSlug', opts.subcampaign)
      const qs = params.toString()
      const data = await get(`/api/campaigns/${opts.campaign}/quests${qs ? `?${qs}` : ''}`)
      print(
        opts.json
          ? data
          : data.map((q) => ({
              name: q.name,
              slug: q.slug,
              status: q.status,
              secret: q.isSecret ? 'yes' : '',
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create a quest')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Quest name')
    .option('--status <status>', 'Status (default: active)')
    .option('--description <desc>', 'Quest description')
    .option('--subcampaign <slug>', 'Sub-campaign slug (defaults to the campaign default)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/quests`, {
        name: opts.name,
        status: opts.status || 'active',
        description: opts.description,
        subCampaignSlug: opts.subcampaign,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Quest created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('update')
    .description('Update a quest')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Quest slug')
    .option('--name <name>', 'New name')
    .option('--status <status>', 'New status')
    .option('--description <desc>', 'New description')
    .option('--subcampaign <slug>', 'Move to a different sub-campaign (by slug)')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.status !== undefined) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      if (opts.subcampaign !== undefined) body.subCampaignSlug = opts.subcampaign
      await put(`/api/campaigns/${opts.campaign}/quests/${opts.slug}`, body)
      success('Quest updated.')
    })

  cmd
    .command('delete')
    .description('Delete a quest')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Quest slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete quest "${opts.slug}"? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/quests/${opts.slug}`)
      success(`Quest ${opts.slug} deleted.`)
    })

  return cmd
}
