import { Command } from 'commander'
import { get, post, put, postMultipart } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { existsSync } from 'fs'

export function makeCharacterCommand() {
  const cmd = new Command('character').description('Manage characters')

  cmd
    .command('list')
    .description('List characters in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(c => ({ name: c.name, slug: c.slug, type: c.type || '', class: c.class || '' })))
      }
    })

  cmd
    .command('create')
    .description('Create a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Character name')
    .option('--class <class>', 'Character class')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/characters`, {
        name: opts.name,
        class: opts.class,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Character created: ${data.name} (/${data.slug})`)
      }
    })

  cmd
    .command('show <slug>')
    .description('Show character details')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters/${slug}`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print({
          name: data.name,
          slug: data.slug,
          type: data.characterType || '',
          class: data.class || '',
          race: data.race || '',
          portrait: data.portraitUrl || '(none)',
        })
      }
    })

  cmd
    .command('update <slug>')
    .description('Update character fields and/or content')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'Character name')
    .option('--race <race>', 'Race')
    .option('--class <class>', 'Class')
    .option('--alignment <alignment>', 'Alignment')
    .option('--status <status>', 'Status (alive, dead, missing, unknown)')
    .option('--content <markdown>', 'Markdown content (biography, notes)')
    .option('--stdin', 'Read markdown content from stdin')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (opts.content && opts.stdin) {
        process.stderr.write('Error: --content and --stdin are mutually exclusive\n')
        process.exit(1)
      }
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.race !== undefined) body.race = opts.race
      if (opts.class !== undefined) body.class = opts.class
      if (opts.alignment !== undefined) body.alignment = opts.alignment
      if (opts.status !== undefined) body.status = opts.status
      if (opts.stdin) {
        body.content = await new Promise((resolve) => {
          let data = ''
          process.stdin.setEncoding('utf8')
          process.stdin.on('data', chunk => { data += chunk })
          process.stdin.on('end', () => resolve(data))
        })
      } else if (opts.content !== undefined) {
        body.content = opts.content
      }
      if (Object.keys(body).length === 0) {
        process.stderr.write('Error: provide at least one field to update (--name, --race, --class, --alignment, --status, --content, --stdin)\n')
        process.exit(1)
      }
      const data = await put(`/api/campaigns/${opts.campaign}/characters/${slug}`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Character updated: ${slug}`)
      }
    })

  cmd
    .command('upload-portrait')
    .description('Upload a portrait image for a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Character slug')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .action(async (opts) => {
      if (!existsSync(opts.file)) {
        process.stderr.write(`Error: File not found: ${opts.file}\n`)
        process.exit(1)
      }
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/characters/${opts.slug}/portrait`,
        opts.file,
        'portrait',
      )
      success(`Portrait uploaded: ${data.portraitUrl}`)
    })

  return cmd
}
