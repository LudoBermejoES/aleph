import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeLocationCommand() {
  const cmd = new Command('location').description('Manage locations')

  cmd
    .command('list')
    .description('List locations in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--search <query>', 'Filter by name')
    .option('--subtype <subtype>', 'Filter by subtype (country, region, city, town, village, dungeon, lair, building, room, wilderness, other)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      if (opts.search) params.set('search', opts.search)
      if (opts.subtype) params.set('subtype', opts.subtype)
      const qs = params.toString()
      const data = await get(`/api/campaigns/${opts.campaign}/locations${qs ? `?${qs}` : ''}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(l => ({
          name: l.name,
          slug: l.slug,
          subtype: l.subtype || 'other',
          parent: l.parentName || '',
          inhabitants: l.inhabitantCount || 0,
        })))
      }
    })

  cmd
    .command('create')
    .description('Create a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Location name')
    .option('--subtype <subtype>', 'Subtype (country, region, city, town, village, dungeon, lair, building, room, wilderness, other)', 'other')
    .option('--parent <id>', 'Parent location ID')
    .option('--visibility <vis>', 'Visibility (members, public, editors, dm_only, private)', 'members')
    .option('--content <text>', 'Description content')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/locations`, {
        name: opts.name,
        subtype: opts.subtype,
        parentId: opts.parent || undefined,
        visibility: opts.visibility,
        content: opts.content || '',
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Location created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('show <slug>')
    .description('Show location details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/locations/${slug}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({
          name: data.name,
          slug: data.slug,
          subtype: data.subtype || 'other',
          visibility: data.visibility,
          ancestors: (data.ancestors || []).map(a => a.name).join(' > ') || 'none',
          content: data.content ? data.content.slice(0, 100) + (data.content.length > 100 ? '...' : '') : '',
        })
      }
    })

  cmd
    .command('edit <slug>')
    .description('Edit a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New name')
    .option('--subtype <subtype>', 'New subtype')
    .option('--parent <id>', 'New parent location ID')
    .option('--visibility <vis>', 'New visibility')
    .option('--content <text>', 'New description content')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name) body.name = opts.name
      if (opts.subtype) body.subtype = opts.subtype
      if (opts.parent !== undefined) body.parentId = opts.parent || null
      if (opts.visibility) body.visibility = opts.visibility
      if (opts.content !== undefined) body.content = opts.content
      const data = await put(`/api/campaigns/${opts.campaign}/locations/${slug}`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Location updated: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('delete <slug>')
    .description('Delete a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        process.stdout.write(`Delete location "${slug}"? [y/N] `)
        const answer = await new Promise(resolve => {
          process.stdin.once('data', d => resolve(d.toString().trim()))
        })
        if (answer.toLowerCase() !== 'y') {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/locations/${slug}`)
      success(`Location "${slug}" deleted.`)
    })

  // inhabitants subcommands
  cmd
    .command('inhabitants <slug>')
    .description('List inhabitants of a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/locations/${slug}/inhabitants`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(c => ({ name: c.name, slug: c.slug, type: c.characterType })))
      }
    })

  cmd
    .command('inhabitant-add <slug>')
    .description('Add a character as inhabitant of a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--character <id>', 'Character ID')
    .action(async (slug, opts) => {
      await post(`/api/campaigns/${opts.campaign}/locations/${slug}/inhabitants`, { characterId: opts.character })
      success(`Character added as inhabitant of "${slug}".`)
    })

  cmd
    .command('inhabitant-remove <slug>')
    .description('Remove a character from a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--character <id>', 'Character ID')
    .action(async (slug, opts) => {
      await del(`/api/campaigns/${opts.campaign}/locations/${slug}/inhabitants/${opts.character}`)
      success(`Character removed from "${slug}".`)
    })

  // organization subcommands
  cmd
    .command('organizations <slug>')
    .description('List organizations linked to a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/locations/${slug}/organizations`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(o => ({ name: o.name, slug: o.slug, members: o.memberCount })))
      }
    })

  cmd
    .command('org-add <slug>')
    .description('Link an organization to a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--org <id>', 'Organization ID')
    .action(async (slug, opts) => {
      await post(`/api/campaigns/${opts.campaign}/locations/${slug}/organizations`, { organizationId: opts.org })
      success(`Organization linked to "${slug}".`)
    })

  cmd
    .command('org-remove <slug>')
    .description('Unlink an organization from a location')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--org <id>', 'Organization ID')
    .action(async (slug, opts) => {
      await del(`/api/campaigns/${opts.campaign}/locations/${slug}/organizations/${opts.org}`)
      success(`Organization unlinked from "${slug}".`)
    })

  return cmd
}
