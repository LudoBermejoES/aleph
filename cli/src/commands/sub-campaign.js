import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeSubCampaignCommand() {
  const cmd = new Command('sub-campaign').description('Manage sub-campaigns')

  cmd
    .command('list')
    .description('List sub-campaigns in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/sub-campaigns`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(
          data.map((sc) => ({
            name: sc.name,
            slug: sc.slug,
            default: sc.isDefault ? 'yes' : '',
            description: sc.description || '',
          })),
        )
      }
    })

  cmd
    .command('create')
    .description('Create a sub-campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Sub-campaign name')
    .option('--description <desc>', 'Sub-campaign description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/sub-campaigns`, {
        name: opts.name,
        description: opts.description,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Sub-campaign created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('update <slug>')
    .description('Update a sub-campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New sub-campaign name')
    .option('--description <desc>', 'New sub-campaign description')
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
      await put(`/api/campaigns/${opts.campaign}/sub-campaigns/${slug}`, body)
      if (opts.json) {
        print({ success: true }, { json: true })
      } else {
        success('Sub-campaign updated.')
      }
    })

  cmd
    .command('delete <slug>')
    .description(
      'Delete a sub-campaign (its arcs/sessions/quests move to the default sub-campaign; the default itself cannot be deleted). Use --yes to skip confirmation.',
    )
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete sub-campaign "${slug}"? Its arcs, sessions, and quests will move to the default sub-campaign.`,
          default: false,
        })
        if (!ok) return
      }
      await del(`/api/campaigns/${opts.campaign}/sub-campaigns/${slug}`)
      if (opts.json) {
        print({ success: true }, { json: true })
      } else {
        success(`Sub-campaign deleted: ${slug}`)
      }
    })

  cmd
    .command('audit')
    .description(
      'Report sessions whose arc belongs to a different sub-campaign (read-only unless --fix)',
    )
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--fix', 'Reassign each reported session to its arc sub-campaign')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const report = await get(`/api/campaigns/${opts.campaign}/sub-campaigns/audit`)

      if (!opts.fix) {
        if (opts.json) {
          print(report, { json: true })
        } else if (report.total === 0) {
          success('No incoherent sessions: every session agrees with its arc.')
        } else {
          print(
            report.incoherent.map((r) => ({
              session: r.sessionSlug,
              'session sub-campaign': r.sessionSubCampaignName,
              arc: r.arcSlug,
              'arc sub-campaign': r.arcSubCampaignName,
            })),
          )
        }
        // Non-zero so this can gate a script. Reporting a problem and exiting 0 would make the
        // command useless in CI, which is the only place it will ever run unattended.
        if (report.total > 0) process.exitCode = 1
        return
      }

      const fixed = await post(`/api/campaigns/${opts.campaign}/sub-campaigns/audit-fix`, {})
      if (opts.json) {
        print(fixed, { json: true })
      } else if (fixed.total === 0) {
        success('Nothing to repair.')
      } else {
        success(`Repaired ${fixed.total} session(s): ${fixed.repaired.join(', ')}`)
      }
    })

  return cmd
}
