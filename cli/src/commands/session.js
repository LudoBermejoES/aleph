import { Command } from 'commander'
import { get, post, put, patch, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'
import fs from 'fs'

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

  cmd
    .command('update <slug>')
    .description('Update session metadata')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--title <title>', 'New title')
    .option('--date <date>', 'Scheduled date (YYYY-MM-DD)')
    .option('--status <status>', 'Status: planned|active|completed|cancelled')
    .option('--group <slug>', 'Session group slug (empty string to unset)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.title !== undefined) body.title = opts.title
      if (opts.date !== undefined) body.scheduledDate = opts.date
      if (opts.status !== undefined) body.status = opts.status
      if (opts.group !== undefined) body.groupSlug = opts.group
      if (Object.keys(body).length === 0) {
        process.stderr.write('Error: Provide at least one field to update (--title, --date, --status, --group)\n')
        process.exit(1)
      }
      await put(`/api/campaigns/${opts.campaign}/sessions/${slug}`, body)
      if (opts.json) {
        print({ success: true }, { json: true })
      } else {
        success('Session updated.')
      }
    })

  cmd
    .command('delete <slug>')
    .description('Delete a session (requires confirmation)')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete session "${slug}" in campaign ${opts.campaign}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/sessions/${slug}`)
      success(`Session ${slug} deleted.`)
    })

  // ─── Content subcommand ───────────────────────────────────────────────────

  const content = new Command('content').description('Manage session content (notes, AI notes, summary)')

  content
    .command('get <slug>')
    .description('Get session content')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--type <type>', 'Content type: manual_notes|ai_notes|summary (omit to show all)')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/sessions/${slug}/content`)
      if (opts.type) {
        // raw output suitable for piping
        process.stdout.write((data[opts.type] || '') + '\n')
      } else {
        for (const type of ['manual_notes', 'ai_notes', 'summary']) {
          process.stdout.write(`\n=== ${type} ===\n${data[type] || '(empty)'}\n`)
        }
      }
    })

  content
    .command('set <slug>')
    .description('Set session content from file or stdin')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--type <type>', 'Content type: manual_notes|ai_notes|summary')
    .option('--file <path>', 'Read content from file (default: stdin)')
    .action(async (slug, opts) => {
      const validTypes = ['manual_notes', 'ai_notes', 'summary']
      if (!validTypes.includes(opts.type)) {
        process.stderr.write(`Error: --type must be one of: ${validTypes.join(', ')}\n`)
        process.exit(1)
      }
      let contentText
      if (opts.file) {
        contentText = fs.readFileSync(opts.file, 'utf8')
      } else {
        contentText = await readStdin()
      }
      await put(`/api/campaigns/${opts.campaign}/sessions/${slug}/content`, { type: opts.type, content: contentText })
      success('Content updated.')
    })

  content
    .command('delete <slug> <contentId>')
    .description('Delete a session content entry by ID')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (slug, contentId, opts) => {
      if (!opts.yes) {
        const confirmed = await confirm({ message: `Delete content ${contentId} from session "${slug}"?` })
        if (!confirmed) { process.exit(0) }
      }
      await del(`/api/campaigns/${opts.campaign}/sessions/${slug}/content/${contentId}`)
      success(`Content ${contentId} deleted.`)
    })

  cmd.addCommand(content)

  // ─── Attendance subcommand ─────────────────────────────────────────────────

  const attendance = new Command('attendance').description('Manage session attendance')

  attendance
    .command('set <slug>')
    .description('Set your RSVP status for a session')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--status <status>', 'RSVP status: pending|accepted|declined|tentative')
    .action(async (slug, opts) => {
      const validStatuses = ['pending', 'accepted', 'declined', 'tentative']
      if (!validStatuses.includes(opts.status)) {
        process.stderr.write(`Error: --status must be one of: ${validStatuses.join(', ')}\n`)
        process.exit(1)
      }
      await patch(`/api/campaigns/${opts.campaign}/sessions/${slug}/attendance`, { rsvpStatus: opts.status })
      success('Attendance updated.')
    })

  cmd.addCommand(attendance)

  return cmd
}

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data))
  })
}
