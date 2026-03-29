import { Command } from 'commander'
import { get, post } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeSessionCommand() {
  const cmd = new Command('session').description('Manage game sessions')

  cmd
    .command('list')
    .description('List sessions in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--group <slug>', 'Filter by session group slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = opts.group ? `?groupSlug=${encodeURIComponent(opts.group)}` : ''
      const data = await get(`/api/campaigns/${opts.campaign}/sessions${params}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(s => ({ title: s.title, slug: s.slug, date: s.scheduledDate || '', status: s.status || '', group: s.groupName || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a session')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--title <title>', 'Session title')
    .option('--date <date>', 'Session date (YYYY-MM-DD)')
    .option('--group <slug>', 'Session group slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/sessions`, {
        title: opts.title,
        scheduledDate: opts.date,
        groupSlug: opts.group,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Session created: ${data.title} (/${data.slug})`)
      }
    })

  cmd
    .command('show <slug>')
    .description('Show session details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/sessions/${slug}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        const hasContent = data.hasContent || {}
        print({
          title: data.title,
          slug: data.slug,
          date: data.scheduledDate || '',
          status: data.status || '',
          group: data.groupName || '',
          hasManualNotes: hasContent.manual_notes ? 'yes' : 'no',
          hasAiNotes: hasContent.ai_notes ? 'yes' : 'no',
          hasSummary: hasContent.summary ? 'yes' : 'no',
          summary: (data.summary || '').slice(0, 200),
        })
      }
    })

  return cmd
}
