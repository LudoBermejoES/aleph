import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeSessionGroupCommand() {
  const cmd = new Command('session-group').description('Manage session groups')

  cmd
    .command('list')
    .description('List session groups in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/session-groups`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map((g) => ({ name: g.name, slug: g.slug, description: g.description || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a session group')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Group name')
    .option('--description <desc>', 'Group description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/session-groups`, {
        name: opts.name,
        description: opts.description,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Session group created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('update <slug>')
    .description('Update a session group')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New group name')
    .option('--description <desc>', 'New group description')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      if (Object.keys(body).length === 0) {
        process.stderr.write(
          'Error: Provide at least one field to update (--name, --description)\n',
        )
        process.exit(1)
      }
      await put(`/api/campaigns/${opts.campaign}/session-groups/${slug}`, body)
      if (opts.json) {
        print({ success: true }, { json: true })
      } else {
        success('Session group updated.')
      }
    })

  cmd
    .command('delete <slug>')
    .description(
      'Delete a session group (sessions will be unassigned). Use --yes to skip confirmation.',
    )
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete session group "${slug}"? Sessions will be unassigned.`,
          default: false,
        })
        if (!ok) return
      }
      await del(`/api/campaigns/${opts.campaign}/session-groups/${slug}`)
      if (opts.json) {
        print({ success: true }, { json: true })
      } else {
        success(`Session group deleted: ${slug}`)
      }
    })

  return cmd
}
