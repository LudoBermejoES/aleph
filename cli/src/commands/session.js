import { Command } from 'commander'
import { get, post, put, patch, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'
import fs from 'fs'
import path from 'path'
import { toSpanishDate } from '../lib/date-utils.js'

export function makeSessionCommand() {
  const cmd = new Command('session').description('Manage game sessions')

  cmd
    .command('list')
    .description('List sessions in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--group <slug>', 'Filter by session group slug')
    .option('--page <n>', 'Page number', '1')
    .option('--limit <n>', 'Results per page (0 = all)', '50')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      if (opts.group) params.set('groupSlug', opts.group)
      params.set('page', opts.page)
      params.set('pageSize', opts.limit)
      const qs = params.toString()
      const res = await get(`/api/campaigns/${opts.campaign}/sessions${qs ? `?${qs}` : ''}`)
      const data = Array.isArray(res) ? res : res.data
      const meta = Array.isArray(res) ? null : res.meta
      if (opts.json) {
        print(res, { json: true })
      } else {
        print(
          data.map((s) => ({
            title: s.title,
            slug: s.slug,
            date: s.scheduledDate || '',
            status: s.status || '',
            group: s.groupName || '',
          })),
        )
        if (meta) console.error(`Page ${meta.page}/${meta.totalPages} (${meta.total} total)`)
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
        process.stderr.write(
          'Error: Provide at least one field to update (--title, --date, --status, --group)\n',
        )
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
        const ok = await confirm({
          message: `Delete session "${slug}" in campaign ${opts.campaign}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/sessions/${slug}`)
      success(`Session ${slug} deleted.`)
    })

  // ─── Content subcommand ───────────────────────────────────────────────────

  const content = new Command('content').description(
    'Manage session content (notes, AI notes, summary)',
  )

  content
    .command('get <slug>')
    .description('Get session content')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--type <type>', 'Content type: manual_notes|ai_notes|summary (omit to show all)')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/sessions/${slug}/content`)
      const getContent = (v) => (v && typeof v === 'object' ? v.content : v) || ''
      if (opts.type) {
        // raw output suitable for piping
        process.stdout.write(getContent(data[opts.type]) + '\n')
      } else {
        for (const type of ['manual_notes', 'ai_notes', 'summary']) {
          process.stdout.write(`\n=== ${type} ===\n${getContent(data[type]) || '(empty)'}\n`)
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
      await put(`/api/campaigns/${opts.campaign}/sessions/${slug}/content`, {
        type: opts.type,
        content: contentText,
      })
      success('Content updated.')
    })

  content
    .command('delete <slug> <contentId>')
    .description('Delete a session content entry by ID')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (slug, contentId, opts) => {
      if (!opts.yes) {
        const confirmed = await confirm({
          message: `Delete content ${contentId} from session "${slug}"?`,
        })
        if (!confirmed) {
          process.exit(0)
        }
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
      await patch(`/api/campaigns/${opts.campaign}/sessions/${slug}/attendance`, {
        rsvpStatus: opts.status,
      })
      success('Attendance updated.')
    })

  attendance
    .command('mark <slug>')
    .description('Mark characters as attended (or absent) — DM/co-DM only')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--characters <slugs>', 'Comma-separated character slugs')
    .option('--absent', 'Mark characters as absent instead of attended')
    .option('--json', 'Output raw JSON response')
    .action(async (slug, opts) => {
      if (!opts.characters) {
        process.stderr.write('Error: --characters is required\n')
        process.exit(1)
      }
      const attendees = opts.characters
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (attendees.length === 0) {
        process.stderr.write('Error: --characters must contain at least one slug\n')
        process.exit(1)
      }
      const body = { attendees, attended: !opts.absent }
      const data = await put(
        `/api/campaigns/${opts.campaign}/sessions/${slug}/attendance/bulk`,
        body,
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Marked ${data.updated} character(s) as ${opts.absent ? 'absent' : 'attended'}.`)
        if (data.unresolved && data.unresolved.length > 0) {
          process.stderr.write(
            `Warning: could not resolve characters: ${data.unresolved.join(', ')}\n`,
          )
        }
      }
    })

  cmd.addCommand(attendance)

  // ─── Summarize subcommand ──────────────────────────────────────────────────

  cmd
    .command('summarize <slug>')
    .description('Generate AI content for a session from manual notes')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--type <type>', 'Content type: summary|ai_notes', 'summary')
    .option('--force', 'Skip confirmation when overwriting existing content')
    .action(async (slug, opts) => {
      const validTypes = ['summary', 'ai_notes']
      if (!validTypes.includes(opts.type)) {
        process.stderr.write(`Error: --type must be one of: ${validTypes.join(', ')}\n`)
        process.exit(1)
      }

      if (!opts.force) {
        const existing = await get(
          `/api/campaigns/${opts.campaign}/sessions/${slug}/content`,
        ).catch(() => null)
        if (existing?.[opts.type]) {
          const confirmed = await confirm({
            message: `This will replace the existing ${opts.type}. Continue?`,
          })
          if (!confirmed) {
            process.stderr.write('Aborted.\n')
            process.exit(0)
          }
        }
      }

      const result = await post(`/api/campaigns/${opts.campaign}/sessions/${slug}/generate`, {
        target: opts.type,
      })

      process.stdout.write((result?.content ?? '') + '\n')
    })

  // ─── Import subcommand ────────────────────────────────────────────────────

  cmd
    .command('import')
    .description('Import session notes from files, creating or updating the session')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--manual <file>', 'Path to manual DM notes file')
    .option('--ai <file>', 'Path to AI transcription file (e.g. Gemini notes)')
    .option('--date <date>', 'Override session date (YYYY-MM-DD); default: parsed from filename')
    .option('--no-summarize', 'Skip auto-generating the summary after import')
    .option('--force', 'Skip confirmation prompts')
    .option('--json', 'Output result as JSON')
    .action(async (opts) => {
      if (!opts.manual && !opts.ai) {
        process.stderr.write('Error: Provide at least --manual or --ai\n')
        process.exit(1)
      }

      // Determine date from --date flag or filename
      let dateStr = opts.date
      if (!dateStr) {
        const file = opts.manual || opts.ai
        const match = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/)
        if (match) dateStr = match[1]
      }
      if (!dateStr) {
        process.stderr.write(
          'Error: Could not determine session date from filename. Use --date YYYY-MM-DD\n',
        )
        process.exit(1)
      }

      const title = toSpanishDate(dateStr)

      // Find existing session by scheduledDate or create one
      let session = await findSessionByDate(opts.campaign, dateStr)
      if (!session) {
        session = await post(`/api/campaigns/${opts.campaign}/sessions`, {
          title,
          scheduledDate: dateStr,
        })
        process.stdout.write(`Created session: ${session.title} (${session.slug})\n`)
      } else {
        process.stdout.write(`Found session: ${session.title} (${session.slug})\n`)
      }

      // Set manual_notes
      if (opts.manual) {
        const content = fs.readFileSync(opts.manual, 'utf8')
        await put(`/api/campaigns/${opts.campaign}/sessions/${session.slug}/content`, {
          type: 'manual_notes',
          content,
        })
        process.stdout.write('  manual_notes: set\n')
      }

      // Set ai_notes
      if (opts.ai) {
        const content = fs.readFileSync(opts.ai, 'utf8')
        await put(`/api/campaigns/${opts.campaign}/sessions/${session.slug}/content`, {
          type: 'ai_notes',
          content,
        })
        process.stdout.write('  ai_notes: set\n')
      }

      // Generate summary from manual notes unless disabled
      if (opts.manual && opts.summarize) {
        process.stdout.write('Generating summary...\n')
        try {
          const result = await post(
            `/api/campaigns/${opts.campaign}/sessions/${session.slug}/generate`,
            { target: 'summary' },
          )
          process.stdout.write('  summary: generated\n')
          if (opts.json) {
            print(
              {
                session: session.slug,
                title: session.title,
                date: dateStr,
                summary: result.content,
              },
              { json: true },
            )
            return
          }
        } catch (err) {
          process.stderr.write(`Warning: Could not generate summary: ${err.message}\n`)
        }
      }

      if (opts.json) {
        print({ session: session.slug, title: session.title, date: dateStr }, { json: true })
      } else {
        success(`Session import complete: ${session.title} (${session.slug})`)
      }
    })

  return cmd
}

async function findSessionByDate(campaignId, dateStr) {
  const res = await get(`/api/campaigns/${campaignId}/sessions?pageSize=0`)
  const sessions = Array.isArray(res) ? res : (res.data ?? [])
  return sessions.find((s) => s.scheduledDate && s.scheduledDate.startsWith(dateStr)) ?? null
}

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
  })
}
