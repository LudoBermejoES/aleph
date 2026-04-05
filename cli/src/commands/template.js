import { Command } from 'commander'
import { get, post, put, del } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { confirm } from '@inquirer/prompts'

export function makeTemplateCommand() {
  const cmd = new Command('template').description('Manage entity templates')

  cmd
    .command('list')
    .description('List templates in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/templates`)
      print(
        opts.json
          ? data
          : data.map((t) => ({
              id: t.id,
              name: t.name,
              entityType: t.entityTypeSlug,
              default: t.isDefault ? 'yes' : '',
            })),
        { json: opts.json },
      )
    })

  cmd
    .command('get')
    .description('Show template details including fields')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <templateId>', 'Template ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/templates/${opts.id}`)
      print(data, { json: opts.json })
    })

  cmd
    .command('create')
    .description('Create a template')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Template name')
    .requiredOption('--entity-type <type>', 'Entity type slug')
    .option('--content <json>', 'Fields as JSON array')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name, entityTypeSlug: opts.entityType }
      if (opts.content) body.fields = JSON.parse(opts.content)
      const data = await post(`/api/campaigns/${opts.campaign}/templates`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Template created: ${data.name} (${data.id})`)
      }
    })

  cmd
    .command('update')
    .description('Update a template')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <templateId>', 'Template ID')
    .option('--name <name>', 'New name')
    .option('--content <json>', 'New fields as JSON array')
    .action(async (opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.content !== undefined) body.fields = JSON.parse(opts.content)
      await put(`/api/campaigns/${opts.campaign}/templates/${opts.id}`, body)
      success('Template updated.')
    })

  cmd
    .command('delete')
    .description('Delete a template')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--id <templateId>', 'Template ID')
    .option('--yes', 'Skip confirmation')
    .action(async (opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete template ${opts.id}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/templates/${opts.id}`)
      success(`Template ${opts.id} deleted.`)
    })

  return cmd
}
