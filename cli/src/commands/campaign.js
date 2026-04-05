import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { requireConfig } from '../lib/config.js'
import { writeFile } from 'fs/promises'

export function makeCampaignCommand() {
  const cmd = new Command('campaign').description('Manage campaigns')

  cmd
    .command('list')
    .description('List all campaigns')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get('/api/campaigns')
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(c => ({ id: c.id, name: c.name, role: c.role, description: c.description || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a new campaign')
    .requiredOption('--name <name>', 'Campaign name')
    .option('--description <desc>', 'Campaign description')
    .option('--theme <theme>', 'Visual theme (e.g. dark-fantasy, cyberpunk)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post('/api/campaigns', {
        name: opts.name,
        description: opts.description,
        theme: opts.theme,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Campaign created: ${data.name} (${data.id})`)
      }
    })

  cmd
    .command('show <id>')
    .description('Show campaign details')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      const data = await get(`/api/campaigns/${id}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({ id: data.id, name: data.name, description: data.description || '', theme: data.theme || 'default' })
      }
    })

  cmd
    .command('delete <id>')
    .description('Delete a campaign (requires confirmation)')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (id, opts) => {
      if (!opts.yes) {
        const ok = await confirm({ message: `Delete campaign ${id}? This cannot be undone.`, default: false })
        if (!ok) { process.stdout.write('Cancelled.\n'); return }
      }
      await del(`/api/campaigns/${id}`)
      success(`Campaign ${id} deleted.`)
    })

  cmd
    .command('export <id>')
    .description('Export campaign data as JSON')
    .option('--format <format>', 'Export format (default: json)', 'json')
    .option('--include <types>', 'Comma-separated resource types to include (default: all)')
    .option('--output <file>', 'Output file path (default: stdout)')
    .action(async (id, opts) => {
      const config = requireConfig()
      const url = new URL(`${config.url.replace(/\/$/, '')}/api/campaigns/${id}/export`)
      if (opts.include) url.searchParams.set('include', opts.include)

      let res
      try {
        res = await fetch(url.toString(), {
          headers: { 'X-API-Key': config.apiKey },
        })
      } catch (err) {
        process.stderr.write(`Network error: ${err.message}\n`)
        process.exit(2)
      }

      if (res.status === 401) {
        process.stderr.write('Error: Not authenticated. Check your API key.\n')
        process.exit(2)
      }
      if (res.status === 403) {
        process.stderr.write('Error: Access denied. Only DMs and Co-DMs can export campaign data.\n')
        process.exit(2)
      }
      if (res.status === 404) {
        process.stderr.write(`Error: Campaign not found: ${id}\n`)
        process.exit(2)
      }
      if (!res.ok) {
        process.stderr.write(`Error: HTTP ${res.status}\n`)
        process.exit(2)
      }

      const text = await res.text()
      if (opts.output) {
        await writeFile(opts.output, text, 'utf8')
        success(`Campaign exported to ${opts.output}`)
      } else {
        process.stdout.write(text)
      }
    })

  return cmd
}
