import { Command } from 'commander'
import { get, post, del, resolveEntitySlug } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { createInterface } from 'readline'

export function makeRelationCommand() {
  const cmd = new Command('relation').description('Manage entity relations')

  cmd
    .command('create')
    .description('Create a bidirectional relation between two entities')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--source <slug>', 'Source entity slug')
    .requiredOption('--target <slug>', 'Target entity slug')
    .option('--type <slug>', 'Relation type slug (e.g. ally, enemy, rival, mentor, custom)', 'custom')
    .option('--forward <label>', 'Forward relation label (source → target); overrides type default')
    .option('--reverse <label>', 'Reverse relation label (target → source); overrides type default')
    .option('--attitude <number>', 'Attitude score (-100 to 100)', parseInt)
    .option('--description <text>', 'Relation description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const [sourceEntityId, targetEntityId] = await Promise.all([
        resolveEntitySlug(opts.campaign, opts.source),
        resolveEntitySlug(opts.campaign, opts.target),
      ])
      // Resolve relation type slug → ID
      const types = await get(`/api/campaigns/${opts.campaign}/relation-types`)
      const relType = types.find(t => t.slug === opts.type)
      if (!relType) {
        process.stderr.write(`Error: Unknown relation type "${opts.type}". Available: ${types.map(t => t.slug).join(', ')}\n`)
        process.exit(2)
      }
      const body = { sourceEntityId, targetEntityId, relationTypeId: relType.id }
      body.forwardLabel = opts.forward ?? relType.forwardLabel
      body.reverseLabel = opts.reverse ?? relType.reverseLabel
      if (opts.attitude !== undefined) body.attitude = opts.attitude
      if (opts.description !== undefined) body.description = opts.description
      const data = await post(`/api/campaigns/${opts.campaign}/relations`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Relation created: ${data.id}`)
      }
    })

  cmd
    .command('list')
    .description('List entity relations in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--entity <slug>', 'Filter by entity slug')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      let url = `/api/campaigns/${opts.campaign}/relations`
      if (opts.entity) {
        const entityId = await resolveEntitySlug(opts.campaign, opts.entity)
        url += `?entity_id=${entityId}`
      }
      const data = await get(url)
      if (opts.json) {
        print(data, { json: true })
      } else {
        const entityRes = await get(`/api/campaigns/${opts.campaign}/entities?limit=500`)
        const allEntities = Array.isArray(entityRes) ? entityRes : (entityRes.entities ?? [])
        const nameMap = Object.fromEntries(allEntities.map(e => [e.id, e.name]))
        print(data.map(r => ({
          id: r.id,
          source: nameMap[r.sourceEntityId] ?? r.sourceEntityId,
          target: nameMap[r.targetEntityId] ?? r.targetEntityId,
          forward: r.forwardLabel || '',
          reverse: r.reverseLabel || '',
          attitude: r.attitude ?? 0,
        })))
      }
    })

  cmd
    .command('delete <relationId>')
    .description('Delete a relation by ID')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (relationId, opts) => {
      if (!opts.yes) {
        const confirmed = await new Promise((resolve) => {
          const rl = createInterface({ input: process.stdin, output: process.stdout })
          rl.question(`Delete relation ${relationId}? (y/N) `, (answer) => {
            rl.close()
            resolve(answer.toLowerCase() === 'y')
          })
        })
        if (!confirmed) {
          process.stdout.write('Aborted.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/relations/${relationId}`)
      success(`Relation deleted: ${relationId}`)
    })

  return cmd
}
