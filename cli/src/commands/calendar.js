import { Command } from 'commander'
import { get, post, put, patch, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeCalendarCommand() {
  const cmd = new Command('calendar').description('Manage campaign calendars')

  cmd
    .command('list')
    .description('List calendars in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/calendars`)
      print(opts.json ? data : data.map(c => ({ id: c.id, name: c.name })), { json: opts.json })
    })

  cmd
    .command('get')
    .description('Show calendar details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}`)
      print(data, { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a calendar')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Calendar name')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/calendars`, { name: opts.name })
      if (opts.json) { print(data, { json: true }) } else { success(`Calendar created: ${data.name} (${data.id})`) }
    })

  cmd
    .command('update')
    .description('Update a calendar')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .option('--name <name>', 'New name')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      await put(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}`, body)
      success('Calendar updated.')
    })

  cmd
    .command('delete')
    .description('Delete a calendar')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete calendar ${opts.calendar}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}`)
      success(`Calendar ${opts.calendar} deleted.`)
    })

  cmd
    .command('advance')
    .description('Advance the calendar date')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .requiredOption('--days <n>', 'Number of days to advance', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await patch(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}/advance`, { days: opts.days })
      if (opts.json) { print(data, { json: true }) } else { success(`Calendar advanced by ${opts.days} day(s).`) }
    })

  cmd
    .command('events')
    .description('List calendar events')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}/events`)
      print(opts.json ? data : data.map(e => ({ id: e.id, name: e.name, day: e.day })), { json: opts.json })
    })

  cmd
    .command('event-add')
    .description('Add an event to a calendar')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .requiredOption('--name <name>', 'Event name')
    .requiredOption('--day <day>', 'Day number', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}/events`, { name: opts.name, day: opts.day })
      if (opts.json) { print(data, { json: true }) } else { success(`Event added: ${data.name}`) }
    })

  cmd
    .command('event-delete')
    .description('Delete a calendar event')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--calendar <calendarId>', 'Calendar ID')
    .requiredOption('--event <eventId>', 'Event ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete event ${opts.event}?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/calendars/${opts.calendar}/events/${opts.event}`)
      success(`Event ${opts.event} deleted.`)
    })

  return cmd
}
