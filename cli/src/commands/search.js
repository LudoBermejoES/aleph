import { Command } from 'commander'
import { get } from '../lib/client.js'
import { print, info } from '../lib/output.js'

export function makeSearchCommand() {
  return new Command('search')
    .description('Search entities, characters, and sessions in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .argument('<query>', 'Search query')
    .option('--json', 'Output as JSON')
    .action(async (query, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/search?q=${encodeURIComponent(query)}`)
      const results = data.results || data
      if (opts.json) {
        print(results, { json: true })
      } else if (!results.length) {
        info('No results found.')
      } else {
        print(results.map(r => ({ type: r.type, name: r.name, slug: r.slug })))
      }
    })
}
