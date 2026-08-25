import { Command } from 'commander'
import { get, post, put, patch, del, postMultipart } from '../lib/client.js'
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
      print(
        opts.json
          ? data
          : data.map((m) => ({
              name: m.name,
              slug: m.slug,
              width: m.width || '',
              height: m.height || '',
            })),
        { json: opts.json },
      )
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
    .option('--type <type>', "Map type: 'image' (default) or 'osm'")
    .option(
      '--address <address>',
      "Address/city to geocode for the initial view of an 'osm' map (server-side lookup " +
        'via Nominatim; prints the resolved name and coordinates before creating the map)',
    )
    .option(
      '--lat <lat>',
      "Initial center latitude for an 'osm' map (WGS84 degrees) — alternative to --address, " +
        'skips geocoding; must be paired with --lng',
      parseFloat,
    )
    .option(
      '--lng <lng>',
      "Initial center longitude for an 'osm' map (WGS84 degrees) — alternative to --address, " +
        'skips geocoding; must be paired with --lat',
      parseFloat,
    )
    .option('--zoom <zoom>', "Initial zoom level for an 'osm' map", parseInt)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      if ((opts.lat !== undefined) !== (opts.lng !== undefined)) {
        process.stderr.write('Error: --lat and --lng must be given together.\n')
        process.exit(2)
      }

      const body = { name: opts.name }
      if (opts.type !== undefined) body.type = opts.type
      if (opts.zoom !== undefined) body.defaultZoom = opts.zoom

      let geocoded
      if (opts.address) {
        const geo = await post(`/api/campaigns/${opts.campaign}/maps/geocode`, {
          query: opts.address,
        })
        const candidates = geo.candidates || []
        if (candidates.length === 0) {
          process.stderr.write(`Error: No geocoding results for "${opts.address}"\n`)
          process.exit(2)
        }
        ;[geocoded] = candidates
        process.stdout.write(
          `Geocoded "${opts.address}" -> ${geocoded.displayName} (${geocoded.lat}, ${geocoded.lng})\n`,
        )
        body.centerLat = geocoded.lat
        body.centerLng = geocoded.lng
      } else if (opts.lat !== undefined) {
        body.centerLat = opts.lat
        body.centerLng = opts.lng
      }

      const data = await post(`/api/campaigns/${opts.campaign}/maps`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Map created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('update')
    .description('Update a map')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .option('--name <name>', 'New name')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
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
        const ok = await confirm({
          message: `Delete map "${opts.slug}"? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
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
      await postMultipart(
        `/api/campaigns/${opts.campaign}/maps/${opts.slug}/upload`,
        opts.file,
        'image',
      )
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
      print(
        opts.json
          ? data
          : data.map((p) => ({
              id: p.id,
              label: p.label || '',
              lat: p.lat,
              lng: p.lng,
              entity: p.entitySlug || '',
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('pin-add')
    .description(
      "Add a pin to a map. --lat/--lng mean different things depending on the parent map's " +
        'type: on an image map they are CRS.Simple-scaled pixel coordinates matching the ' +
        'uploaded image (not real-world coordinates); on an OSM map they are real WGS84 ' +
        "degrees (-90..90 / -180..180). Run `map get` to check the map's type first.",
    )
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--label <label>', 'Pin label')
    .requiredOption(
      '--lat <lat>',
      'Latitude — image map: CRS.Simple pixel Y; OSM map: WGS84 degrees',
      parseFloat,
    )
    .requiredOption(
      '--lng <lng>',
      'Longitude — image map: CRS.Simple pixel X; OSM map: WGS84 degrees',
      parseFloat,
    )
    .option('--entity <slug>', 'Linked entity slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { label: opts.label, lat: opts.lat, lng: opts.lng }
      if (opts.entity) body.entitySlug = opts.entity
      const data = await post(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/pins`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Pin added: ${data.id}`)
      }
    })

  cmd
    .command('pin-move')
    .description(
      "Move a pin to new coordinates. Accepts only --lat/--lng -- label/colour/entity can't " +
        'be changed this way. Same coordinate-space rule as `pin-add`: image map = ' +
        'CRS.Simple pixels, OSM map = WGS84 degrees.',
    )
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Map slug')
    .requiredOption('--pin <pinId>', 'Pin ID')
    .requiredOption('--lat <lat>', 'New latitude', parseFloat)
    .requiredOption('--lng <lng>', 'New longitude', parseFloat)
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await patch(
        `/api/campaigns/${opts.campaign}/maps/${opts.slug}/pins/${opts.pin}`,
        {
          lat: opts.lat,
          lng: opts.lng,
        },
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Pin ${opts.pin} moved to (${data.lat}, ${data.lng}).`)
      }
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
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
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
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
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
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/maps/${opts.slug}/regions/${opts.region}`)
      success(`Region ${opts.region} deleted.`)
    })

  return cmd
}
