import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { readFileSync } from 'fs'

export function makeEntityCommand() {
  const cmd = new Command('entity').description('Manage wiki entities')

  cmd
    .command('list')
    .description('List entities in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--type <type>', 'Filter by entity type')
    .option('--search <q>', 'Search query')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      if (opts.type) params.set('type', opts.type)
      if (opts.search) params.set('q', opts.search)
      const qs = params.toString() ? `?${params}` : ''
      const data = await get(`/api/campaigns/${opts.campaign}/entities${qs}`)
      const entities = data.entities || data
      if (opts.json) {
        print(entities, { json: true })
      } else {
        print(entities.map(e => ({ name: e.name, type: e.type, slug: e.slug, visibility: e.visibility })))
      }
    })

  cmd
    .command('create')
    .description('Create an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Entity name')
    .requiredOption('--type <type>', 'Entity type (e.g. location, faction, npc)')
    .option('--content <markdown>', 'Entity content (Markdown)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/entities`, {
        name: opts.name,
        type: opts.type,
        content: opts.content || '',
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Entity created: ${data.name} (/${data.slug})`)
      }
    })

  cmd
    .command('show <slug>')
    .description('Show entity details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/entities/${slug}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({ name: data.name, type: data.type, slug: data.slug, visibility: data.visibility, tags: (data.tags || []).join(', '), content: (data.content || '').slice(0, 200) })
      }
    })

  cmd
    .command('edit <slug>')
    .description('Edit an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New name')
    .option('--content <markdown>', 'New content (Markdown)')
    .option('--stdin', 'Read content from stdin')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name) body.name = opts.name
      if (opts.stdin) {
        body.content = readFileSync('/dev/stdin', 'utf8')
      } else if (opts.content) {
        body.content = opts.content
      }
      const data = await put(`/api/campaigns/${opts.campaign}/entities/${slug}`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Entity updated: ${slug}`)
      }
    })

  cmd
    .command('delete <slug>')
    .description('Delete an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (slug, opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete entity "${slug}"?`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${opts.campaign}/entities/${slug}`)
      success(`Entity "${slug}" deleted.`)
    })

  return cmd
}
