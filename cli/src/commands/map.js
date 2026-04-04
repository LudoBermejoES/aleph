import { Command } from 'commander'
import { get, post, put, del, postMultipart } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'
import { existsSync } from 'fs'

export function makeMapCommand() {
  const cmd = new Command('map').description('Manage campaign maps')

  cmd
    .command('list')
    .description('List maps in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/maps`)
      print(opts.json ? data : data.map(m => ({ name: m.name, slug: m.slug, width: m.width || '', height: m.height || '' })), { json: opts.json })
    })

  cmd
    .command('get')
    .description('Show map details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/maps/${opts.slug}`)
      print(data, { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a map')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Map name')
    .option('--description <desc>', 'Map description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/maps`, { name: opts.name, description: opts.description })
      if (opts.json) { print(data, { json: true }) } else { success(`Map created: ${data.name} (${data.slug})`) }
    })

  cmd
    .command('update')
    .description('Update a map')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .option('--name <name>', 'New name')
    .option('--description <desc>', 'New description')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.description !== undefined) body.description = opts.description
      await put(`/api/campaigns/${opts.campaign}/maps/${opts.slug}`, body)
      success('Map updated.')
    })

  cmd
    .command('delete')
    .description('Delete a map')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete map "${opts.slug}"? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/maps/${opts.slug}`)
      success(`Map ${opts.slug} deleted.`)
    })

  cmd
    .command('upload')
    .description('Upload a map image')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--file <path>', 'Path to image file')
    .action(async (opts) => {
      if (!existsSync(opts.file)) {
        process.stderr.write(`Error: File not found: ${opts.file}\n`)
        process.exit(1)
      }
      await postMultipart(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/upload`, opts.file, 'file')
      success('Map image uploaded.')
    })

  cmd
    .command('pins')
    .description('List map pins')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/pins`)
      print(opts.json ? data : data.map(p => ({ id: p.id, label: p.label || '', x: p.x, y: p.y, entity: p.entitySlug || '' })), { json: opts.json })
    })

  cmd
    .command('pin-add')
    .description('Add a pin to a map')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--label <label>', 'Pin label')
    .requiredOption('--x <x>', 'X coordinate', parseFloat)
    .requiredOption('--y <y>', 'Y coordinate', parseFloat)
    .option('--entity <slug>', 'Linked entity slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { label: opts.label, x: opts.x, y: opts.y }
      if (opts.entity) body.entitySlug = opts.entity
      const data = await post(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/pins`, body)
      if (opts.json) { print(data, { json: true }) } else { success(`Pin added: ${data.id}`) }
    })

  cmd
    .command('pin-delete')
    .description('Delete a map pin')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--pin <pinId>', 'Pin ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete pin ${opts.pin}?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/pins/${opts.pin}`)
      success(`Pin ${opts.pin} deleted.`)
    })

  cmd
    .command('layer-update')
    .description('Update a map layer')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--layer <layerId>', 'Layer ID')
    .option('--name <name>', 'New name')
    .option('--opacity <n>', 'Opacity (0-1)', parseFloat)
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.opacity !== undefined) body.opacity = opts.opacity
      await put(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/layers/${opts.layer}`, body)
      success('Layer updated.')
    })

  cmd
    .command('layer-delete')
    .description('Delete a map layer')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--layer <layerId>', 'Layer ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete layer ${opts.layer}?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/layers/${opts.layer}`)
      success(`Layer ${opts.layer} deleted.`)
    })

  cmd
    .command('region-update')
    .description('Update a map region')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--region <regionId>', 'Region ID')
    .option('--name <name>', 'New name')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      await put(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/regions/${opts.region}`, body)
      success('Region updated.')
    })

  cmd
    .command('region-delete')
    .description('Delete a map region')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--region <regionId>', 'Region ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete region ${opts.region}?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/regions/${opts.region}`)
      success(`Region ${opts.region} deleted.`)
    })

  return cmd
}
