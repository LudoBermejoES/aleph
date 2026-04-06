import { Command } from 'commander'
import { get, post, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeDiagramCommand() {
  const cmd = new Command('diagram').description('Manage campaign diagrams')

  cmd
    .command('list')
    .description('List diagrams in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/diagrams`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        if (!data.length) {
          console.log('No diagrams found.')
          return
        }
        print(
          data.map((d) => ({
            id: d.id,
            title: d.title,
            type: d.diagramType || 'freeform',
            updated: d.updatedAt,
          })),
        )
      }
    })

  cmd
    .command('create')
    .description('Create a new diagram')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--title <title>', 'Diagram title')
    .option(
      '--type <type>',
      'Diagram type (freeform, entity-graph, quest-tree, faction-web, session-timeline)',
      'freeform',
    )
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/diagrams`, {
        title: opts.title,
        diagramType: opts.type,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Diagram created: ${data.title} (id: ${data.id})`)
      }
    })

  cmd
    .command('delete <diagramId>')
    .description('Delete a diagram')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (diagramId, opts) => {
      if (!opts.yes) {
        const confirmed = await confirm({ message: `Delete diagram ${diagramId}?` })
        if (!confirmed) {
          console.log('Cancelled.')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/diagrams/${diagramId}`)
      success(`Diagram ${diagramId} deleted.`)
    })

  cmd
    .command('generate')
    .description('Generate a diagram from campaign data')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption(
      '--type <type>',
      'Generation type: entity-graph, quest-tree, faction-web, session-timeline',
    )
    .option('--title <title>', 'Diagram title')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/diagrams/generate`, {
        type: opts.type,
        title: opts.title,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Diagram generated: ${data.title} (id: ${data.id}, ${data.shapeCount} shapes)`)
      }
    })

  return cmd
}
