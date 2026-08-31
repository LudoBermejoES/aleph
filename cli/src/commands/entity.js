import { Command } from 'commander'
import { confirm } from '@inquirer/prompts'
import { get, post, put, patch, del, postMultipart } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { readFileSync, existsSync } from 'fs'

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
        print(
          entities.map((e) => ({
            name: e.name,
            type: e.type,
            slug: e.slug,
            visibility: e.visibility,
          })),
        )
      }
    })

  cmd
    .command('create')
    .description('Create an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Entity name')
    .requiredOption('--type <type>', 'Entity type; must be registered for this campaign')
    .option('--content <markdown>', 'Entity content (Markdown)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      // The type must be one the campaign declares. Without this the CLI wrote any string it was
      // given: `--type npc` produced the only `npc` entity in a campaign whose registered types are
      // character/event/faction/item/location/lore/note/quest/session, leaving a record the UI could
      // not categorise and that only the generic page could reach. One request buys the whole class.
      const types = await get(`/api/campaigns/${opts.campaign}/entity-types`)
      const valid = (Array.isArray(types) ? types : (types?.entityTypes ?? types?.data ?? []))
        .map((t) => t.slug)
        .filter(Boolean)
      if (valid.length && !valid.includes(opts.type)) {
        process.stderr.write(
          `Error: unknown entity type '${opts.type}' for this campaign.\n` +
            `Registered types: ${[...new Set(valid)].sort().join(', ')}\n`,
        )
        // `process.exit()` here aborted the process with a libuv assertion (exit 127 on
        // Windows) because this guard runs AFTER an await on the entity-types request and
        // the socket handle was still open. The sibling guards exit cleanly only because
        // they run before any network call. Setting exitCode lets node drain and exit 1.
        process.exitCode = 1
        return
      }

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
        const row = {
          name: data.name,
          type: data.type,
          slug: data.slug,
          visibility: data.visibility,
          tags: (data.tags || []).join(', '),
          content: (data.content || '').slice(0, 200),
        }
        if (data.boardSummary) row['graph label'] = data.boardSummary
        print(row)
      }
    })

  cmd
    .command('edit <slug>')
    .description('Edit an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New name')
    .option('--content <markdown>', 'New content (Markdown)')
    .option('--stdin', 'Read content from stdin')
    .option('--board-summary <text>', 'Short label shown on the graph card (max 120 chars)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name) body.name = opts.name
      if (opts.stdin) {
        body.content = readFileSync('/dev/stdin', 'utf8')
      } else if (opts.content) {
        body.content = opts.content
      }
      if (opts.boardSummary !== undefined) body.boardSummary = opts.boardSummary || null
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
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/entities/${slug}`)
      success(`Entity "${slug}" deleted.`)
    })

  cmd
    .command('upload-image')
    .description('Upload an image for an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--slug <slug>', 'Entity slug')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      if (!existsSync(opts.file)) {
        process.stderr.write(`Error: File not found: ${opts.file}\n`)
        process.exit(1)
      }
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/entities/${opts.slug}/image`,
        opts.file,
        'image',
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Image uploaded: ${data.imageUrl}`)
      }
    })

  cmd
    .command('type-update <typeId>')
    .description('Update an entity type')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New type name')
    .action(async (typeId, opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      await put(`/api/campaigns/${opts.campaign}/entity-types/${typeId}`, body)
      success('Entity type updated.')
    })

  cmd
    .command('type-delete <typeId>')
    .description('Delete an entity type')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (typeId, opts) => {
      if (!opts.yes) {
        const ok = await confirm({
          message: `Delete entity type ${typeId}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/entity-types/${typeId}`)
      success(`Entity type ${typeId} deleted.`)
    })

  // ─── Gallery images ─────────────────────────────────────────────────────────
  //
  // `upload-image` above is the pre-gallery command: ONE image, written straight into
  // `entities.image_url`. These five drive `entities/:slug/images`, mirroring `character images |
  // image-add | image-update | image-set-primary | image-remove` one command per route.

  cmd
    .command('images <slug>')
    .description("List an entity's gallery images")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/entities/${slug}/images`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(
          data.map((i) => ({
            id: i.id,
            main: i.isPrimary ? '*' : '',
            order: i.sortOrder,
            caption: i.caption || '',
            url: i.url,
          })),
        )
      }
    })

  cmd
    .command('image-add <slug>')
    .description("Upload an image to an entity's gallery")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .option('--caption <text>', 'Caption for the image')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (!existsSync(opts.file)) {
        process.stderr.write(`Error: File not found: ${opts.file}\n`)
        process.exit(1)
      }
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/entities/${slug}/images`,
        opts.file,
        'image',
        { caption: opts.caption },
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Image uploaded: ${data.id} → ${data.url}`)
      }
    })

  cmd
    .command('image-update <slug> <imageId>')
    .description("Update an entity gallery image's caption or order")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--caption <text>', 'New caption (empty string clears it)')
    .option('--order <n>', 'New sort order')
    .action(async (slug, imageId, opts) => {
      const body = {}
      if (opts.caption !== undefined) body.caption = opts.caption || null
      if (opts.order !== undefined) body.sortOrder = Number(opts.order)
      if (Object.keys(body).length === 0) {
        process.stderr.write('Error: pass --caption and/or --order\n')
        process.exit(2)
      }
      await patch(`/api/campaigns/${opts.campaign}/entities/${slug}/images/${imageId}`, body)
      success(`Image ${imageId} updated.`)
    })

  cmd
    .command('image-set-primary <slug> <imageId>')
    .description("Make an image the entity's main image")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await patch(`/api/campaigns/${opts.campaign}/entities/${slug}/images/${imageId}`, {
        isPrimary: true,
      })
      success(`Image ${imageId} is now the main image of "${slug}".`)
    })

  cmd
    .command('image-remove <slug> <imageId>')
    .description('Delete an entity gallery image')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await del(`/api/campaigns/${opts.campaign}/entities/${slug}/images/${imageId}`)
      success(`Image ${imageId} deleted from "${slug}".`)
    })

  // ─── Nickname subcommand ────────────────────────────────────────────────────

  const nickname = new Command('nickname').description('Manage entity nicknames')

  nickname
    .command('list <slug>')
    .description('List nicknames for an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/entities/${slug}/nicknames`)
      if (opts.json) {
        print(data, { json: true })
      } else if (data.length === 0) {
        process.stdout.write('(no nicknames)\n')
      } else {
        for (const n of data) process.stdout.write(`${n.nickname}\n`)
      }
    })

  nickname
    .command('add <slug> <nickname>')
    .description('Add a nickname to an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, nicknameValue, opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/entities/${slug}/nicknames`, {
        nickname: nicknameValue,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Nickname added: ${data.nickname}`)
      }
    })

  nickname
    .command('remove <slug> <nickname>')
    .description('Remove a nickname from an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, nicknameValue, opts) => {
      const existing = await get(`/api/campaigns/${opts.campaign}/entities/${slug}/nicknames`)
      const match = existing.find((n) => n.nickname.toLowerCase() === nicknameValue.toLowerCase())
      if (!match) {
        process.stderr.write(`Error: Nickname "${nicknameValue}" not found on "${slug}"\n`)
        process.exit(1)
      }
      await del(`/api/campaigns/${opts.campaign}/entities/${slug}/nicknames/${match.id}`)
      success(`Nickname removed: ${match.nickname}`)
    })

  cmd.addCommand(nickname)

  return cmd
}
