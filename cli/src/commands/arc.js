import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'
import { sortOrderOrExit } from '../lib/arcs.js'

export function makeArcCommand() {
  const cmd = new Command('arc').description('Manage campaign arcs')

  cmd
    .command('list')
    .description('List arcs in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/arcs`)
      print(
        opts.json
          ? data
          : data.map((a) => ({
              slug: a.slug,
              name: a.name,
              status: a.status || '',
              sortOrder: a.sortOrder ?? 0,
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create an arc')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Arc name')
    .option('--status <status>', 'Arc status')
    .option('--description <desc>', 'Arc description')
    .option('--sort-order <n>', 'Position among the arcs of the campaign (number, default 0)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.status !== undefined) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      if (opts.sortOrder !== undefined) body.sortOrder = sortOrderOrExit(opts.sortOrder)
      const data = await post(`/api/campaigns/${opts.campaign}/arcs`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        const slug = data.slug ?? (await lookupArcSlug(opts.campaign, data.id))
        success(`Arc created: ${data.name}${slug ? ` (${slug})` : ''}`)
      }
    })

  cmd
    .command('update')
    .description('Update an arc')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Arc slug')
    .option('--name <name>', 'New name')
    .option('--status <status>', 'New status')
    .option('--description <desc>', 'New description')
    .option('--sort-order <n>', 'New position among the arcs of the campaign (number)')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.status !== undefined) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      if (opts.sortOrder !== undefined) body.sortOrder = sortOrderOrExit(opts.sortOrder)
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
        const ok = await confirm({
          message: `Delete arc "${opts.slug}"? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/arcs/${opts.slug}`)
      success(`Arc ${opts.slug} deleted.`)
    })

  return cmd
}

/**
 * Fallback for servers whose arcs POST response predates the `slug` field:
 * look the freshly created arc up by id so the success line never prints "undefined".
 */
async function lookupArcSlug(campaignId, id) {
  if (!id) return ''
  const arcList = await get(`/api/campaigns/${campaignId}/arcs`).catch(() => [])
  const arc = (Array.isArray(arcList) ? arcList : []).find((a) => a && a.id === id)
  return arc?.slug ?? ''
}
