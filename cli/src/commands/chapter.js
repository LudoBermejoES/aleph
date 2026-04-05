import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeChapterCommand() {
  const cmd = new Command('chapter').description('Manage campaign chapters')

  cmd
    .command('list')
    .description('List chapters in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/chapters`)
      print(
        opts.json ? data : data.map((c) => ({ slug: c.slug, name: c.name, arc: c.arcId || '' })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create a chapter')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Chapter name')
    .option('--arc <arcId>', 'Arc ID to assign this chapter to')
    .option('--description <desc>', 'Chapter description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.arc !== undefined) body.arcId = opts.arc
      if (opts.description !== undefined) body.description = opts.description
      const data = await post(`/api/campaigns/${opts.campaign}/chapters`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Chapter created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('update')
    .description('Update a chapter')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Chapter slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      await put(`/api/campaigns/${opts.campaign}/chapters/${opts.slug}`, body)
      success('Chapter updated.')
    })

  cmd
    .command('delete')
    .description('Delete a chapter')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Chapter slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete chapter "${opts.slug}"? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/chapters/${opts.slug}`)
      success(`Chapter ${opts.slug} deleted.`)
    })

  return cmd
}
