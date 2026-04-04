import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeArcCommand() {
  const cmd = new Command('arc').description('Manage campaign arcs')

  cmd
    .command('list')
    .description('List arcs in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/arcs`)
      print(opts.json ? data : data.map(a => ({ slug: a.slug, name: a.name, status: a.status || '' })), { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create an arc')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Arc name')
    .option('--status <status>', 'Arc status')
    .option('--description <desc>', 'Arc description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.status !== undefined) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      const data = await post(`/api/campaigns/${opts.campaign}/arcs`, body)
      if (opts.json) { print(data, { json: true }) } else { success(`Arc created: ${data.name} (${data.slug})`) }
    })

  cmd
    .command('update')
    .description('Update an arc')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Arc slug')
    .option('--name <name>', 'New name')
    .option('--status <status>', 'New status')
    .option('--description <desc>', 'New description')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.status !== undefined) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      await put(`/api/campaigns/${opts.campaign}/arcs/${opts.slug}`, body)
      success('Arc updated.')
    })

  cmd
    .command('delete')
    .description('Delete an arc')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Arc slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete arc "${opts.slug}"? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/arcs/${opts.slug}`)
      success(`Arc ${opts.slug} deleted.`)
    })

  return cmd
}
