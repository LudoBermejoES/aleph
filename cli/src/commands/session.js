import { Command } from 'commander'
import { get, post } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeSessionCommand() {
  const cmd = new Command('session').description('Manage game sessions')

  cmd
    .command('list')
    .description('List sessions in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/sessions`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(s => ({ title: s.title, slug: s.slug, date: s.date || '', status: s.status || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a session')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--title <title>', 'Session title')
    .option('--date <date>', 'Session date (YYYY-MM-DD)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/sessions`, {
        title: opts.title,
        date: opts.date,
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
        print({ title: data.title, slug: data.slug, date: data.date || '', status: data.status || '', summary: (data.summary || '').slice(0, 200) })
      }
    })

  return cmd
}
