import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'
import { findArcRef, flattenChapters, sortOrderOrExit } from '../lib/arcs.js'

export function makeChapterCommand() {
  const cmd = new Command('chapter').description('Manage campaign chapters')

  cmd
    .command('list')
    .description('List chapters in a campaign (optionally narrowed by arc or sub-campaign)')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--arc <slug>', 'Only chapters of this arc (arc slug or id)')
    .option('--subcampaign <slug>', 'Only chapters whose arc is in this sub-campaign')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      // Was walking GET /arcs because the chapters endpoint hard-required `arc_id` and so could
      // not serve a campaign-wide listing. It can now, and it carries the arc AND the derived
      // sub-campaign by name, so the detour is gone.
      const params = new URLSearchParams()
      if (opts.subcampaign) params.set('subCampaignSlug', opts.subcampaign)
      const qs = params.toString() ? `?${params}` : ''
      const all = await get(`/api/campaigns/${opts.campaign}/chapters${qs}`)
      // `--arc` still accepts a slug OR an id, as it always did.
      const rows = opts.arc
        ? all.filter((c) => c.arcSlug === opts.arc || c.arcId === opts.arc)
        : all
      print(
        opts.json
          ? rows
          : rows.map((c) => ({
              slug: c.slug,
              name: c.name,
              arc: c.arcName,
              subCampaign: c.subCampaignName,
              sortOrder: c.sortOrder,
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('create')
    .description('Create a chapter')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Chapter name')
    .option('--arc <arc>', 'Arc to assign this chapter to (arc slug or arc ID)')
    .option('--description <desc>', 'Chapter description')
    .option('--sort-order <n>', 'Position within the arc (number, default 0)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.arc !== undefined) body.arcId = await resolveArcId(opts.campaign, opts.arc)
      if (opts.description !== undefined) body.description = opts.description
      if (opts.sortOrder !== undefined) body.sortOrder = sortOrderOrExit(opts.sortOrder)
      const data = await post(`/api/campaigns/${opts.campaign}/chapters`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        const slug = data.slug ?? (await lookupChapterSlug(opts.campaign, data.id))
        success(`Chapter created: ${data.name}${slug ? ` (${slug})` : ''}`)
      }
    })

  cmd
    .command('update')
    .description('Update a chapter')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Chapter slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .option('--sort-order <n>', 'New position within the arc (number)')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      if (opts.sortOrder !== undefined) body.sortOrder = sortOrderOrExit(opts.sortOrder)
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

/**
 * Resolve `--arc` to an arc id. A slug match wins; an id is passed through unchanged
 * (so existing id-based invocations keep working); anything else is an error before
 * the POST, because the chapters endpoint would otherwise create an orphan row.
 */
async function resolveArcId(campaignId, ref) {
  const arcList = await get(`/api/campaigns/${campaignId}/arcs`)
  const arc = findArcRef(arcList, ref)
  if (!arc) {
    process.stderr.write(`Error: Arc "${ref}" not found in this campaign (no such slug or id)\n`)
    process.exit(2)
  }
  return arc.id
}

/**
 * Fallback for servers whose chapters POST response predates the `slug` field:
 * look the freshly created chapter up by id so the success line never prints "undefined".
 */
async function lookupChapterSlug(campaignId, id) {
  if (!id) return ''
  const arcList = await get(`/api/campaigns/${campaignId}/arcs`).catch(() => [])
  const chapter = flattenChapters(arcList).find((c) => c.id === id)
  return chapter?.slug ?? ''
}
