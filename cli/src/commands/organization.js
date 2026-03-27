import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeOrganizationCommand() {
  const cmd = new Command('organization').description('Manage organizations')

  cmd
    .command('list')
    .description('List organizations in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/organizations`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(o => ({
          name: o.name,
          slug: o.slug,
          type: o.type,
          status: o.status,
          members: o.memberCount,
        })))
      }
    })

  cmd
    .command('create')
    .description('Create an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Organization name')
    .option('--type <type>', 'Type (faction, guild, army, cult, government, other)', 'faction')
    .option('--status <status>', 'Status (active, inactive, secret, dissolved)', 'active')
    .option('--description <desc>', 'Description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/organizations`, {
        name: opts.name,
        type: opts.type,
        status: opts.status,
        description: opts.description,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Organization created: ${data.name} (${data.slug})`)
      }
    })

  cmd
    .command('show <slug>')
    .description('Show organization details including members')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/organizations/${slug}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({
          name: data.name,
          slug: data.slug,
          type: data.type,
          status: data.status,
          description: data.description || '',
          members: (data.members || []).map(m => `${m.characterName}${m.role ? ` (${m.role})` : ''}`).join(', ') || 'none',
        })
      }
    })

  cmd
    .command('delete <slug>')
    .description('Delete an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        process.stdout.write(`Delete organization "${slug}"? [y/N] `)
        const answer = await new Promise(resolve => {
          process.stdin.once('data', d => resolve(d.toString().trim()))
        })
        if (answer.toLowerCase() !== 'y') {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/organizations/${slug}`)
      success(`Organization "${slug}" deleted.`)
    })

  cmd
    .command('edit <slug>')
    .description('Edit an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New name')
    .option('--type <type>', 'New type (faction, guild, army, cult, government, other)')
    .option('--status <status>', 'New status (active, inactive, secret, dissolved)')
    .option('--description <desc>', 'New description')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name) body.name = opts.name
      if (opts.type) body.type = opts.type
      if (opts.status) body.status = opts.status
      if (opts.description !== undefined) body.description = opts.description
      const data = await put(`/api/campaigns/${opts.campaign}/organizations/${slug}`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Organization updated: ${data.name} (${data.slug})`)
      }
    })

  // member-add subcommand
  cmd
    .command('member-add <slug>')
    .description('Add a character to an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--character <id>', 'Character ID')
    .option('--role <role>', 'Role in the organization')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/organizations/${slug}/members`, {
        characterId: opts.character,
        role: opts.role,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Member added to "${slug}".`)
      }
    })

  // member-remove subcommand
  cmd
    .command('member-remove <slug>')
    .description('Remove a character from an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--character <id>', 'Character ID')
    .action(async (slug, opts) => {
      await del(`/api/campaigns/${opts.campaign}/organizations/${slug}/members/${opts.character}`)
      success(`Member removed from "${slug}".`)
    })

  return cmd
}
