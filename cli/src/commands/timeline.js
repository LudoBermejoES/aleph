import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeTimelineCommand() {
  const cmd = new Command('timeline').description('Manage campaign timelines')

  cmd
    .command('list')
    .description('List timelines in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/timelines`)
      print(opts.json ? data : data.map(t => ({ name: t.name, slug: t.slug })), { json: opts.json })
    })

  cmd
    .command('get')
    .description('Show timeline details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Timeline slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/timelines/${opts.slug}`)
      print(data, { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a timeline')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Timeline name')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/timelines`, { name: opts.name })
      if (opts.json) { print(data, { json: true }) } else { success(`Timeline created: ${data.name} (${data.slug})`) }
    })

  cmd
    .command('update')
    .description('Update a timeline')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Timeline slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      await put(`/api/campaigns/${opts.campaign}/timelines/${opts.slug}`, body)
      success('Timeline updated.')
    })

  cmd
    .command('delete')
    .description('Delete a timeline')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Timeline slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete timeline "${opts.slug}"? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/timelines/${opts.slug}`)
      success(`Timeline ${opts.slug} deleted.`)
    })

  cmd
    .command('event-add')
    .description('Add an event to a timeline')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Timeline slug')
    .requiredOption('--name <name>', 'Event name')
    .option('--description <desc>', 'Event description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/timelines/${opts.slug}/events`, {
        name: opts.name,
        description: opts.description,
      })
      if (opts.json) { print(data, { json: true }) } else { success(`Event added: ${data.name || data.id}`) }
    })

  cmd
    .command('event-delete')
    .description('Delete a timeline event')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Timeline slug')
    .requiredOption('--event <eventId>', 'Event ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete event ${opts.event}?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/timelines/${opts.slug}/events/${opts.event}`)
      success(`Event ${opts.event} deleted.`)
    })

  return cmd
}
