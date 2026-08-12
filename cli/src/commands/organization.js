import { Command } from 'commander'
import { get, post, put, patch, del, postMultipart } from '../lib/client.js'
import { print, success } from '../lib/output.js'
import { existsSync } from 'fs'

export function makeOrganizationCommand() {
  const cmd = new Command('organization').description('Manage organizations')

  cmd
    .command('list')
    .description('List organizations in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--page <n>', 'Page number', '1')
    .option('--limit <n>', 'Results per page (0 = all)', '50')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      params.set('page', opts.page)
      params.set('pageSize', opts.limit)
      const res = await get(`/api/campaigns/${opts.campaign}/organizations?${params.toString()}`)
      const data = Array.isArray(res) ? res : res.data
      const meta = Array.isArray(res) ? null : res.meta
      if (opts.json) {
        print(res, { json: true })
      } else {
        print(
          data.map((o) => ({
            name: o.name,
            slug: o.slug,
            type: o.type,
            status: o.status,
            visibility: o.visibility,
            members: o.memberCount,
          })),
        )
        if (meta) console.error(`Page ${meta.page}/${meta.totalPages} (${meta.total} total)`)
      }
    })

  cmd
    .command('create')
    .description('Create an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Organization name')
    .option('--type <type>', 'Type (faction, guild, army, cult, government, other)', 'faction')
    .option('--status <status>', 'Status (active, inactive, secret, dissolved)', 'active')
    .option(
      '--visibility <vis>',
      'Visibility (public, members, editors, dm_only, private, specific_users)',
    )
    .option('--description <desc>', 'Description')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/organizations`, {
        name: opts.name,
        type: opts.type,
        status: opts.status,
        visibility: opts.visibility,
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
          visibility: data.visibility,
          description: data.description || '',
          members:
            (data.members || [])
              .map((m) => `${m.characterName}${m.role ? ` (${m.role})` : ''}`)
              .join(', ') || 'none',
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
        const answer = await new Promise((resolve) => {
          process.stdin.once('data', (d) => resolve(d.toString().trim()))
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
    .option(
      '--visibility <vis>',
      'New visibility (public, members, editors, dm_only, private, specific_users)',
    )
    .option('--description <desc>', 'New description')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const body = {}
      if (opts.name) body.name = opts.name
      if (opts.type) body.type = opts.type
      if (opts.status) body.status = opts.status
      if (opts.visibility) body.visibility = opts.visibility
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

  // member-update subcommand
  cmd
    .command('member-update <slug>')
    .description("Update a member's role in an organization")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--character <id>', 'Character ID')
    .option('--role <role>', 'New role (pass empty string to clear)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await patch(
        `/api/campaigns/${opts.campaign}/organizations/${slug}/members/${opts.character}`,
        { role: opts.role ?? '' },
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Member role updated in "${slug}".`)
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

  cmd
    .command('upload-image <slug>')
    .description('Upload an image for an organization')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (!existsSync(opts.file)) {
        process.stderr.write(`Error: File not found: ${opts.file}\n`)
        process.exit(1)
      }
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/organizations/${slug}/image`,
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
    .command('images <slug>')
    .description("List an organization's gallery images")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/organizations/${slug}/images`)
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
    .description("Upload an image to an organization's gallery")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .option('--caption <text>', 'Caption for the image')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/organizations/${slug}/images`,
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
    .description("Update an organization gallery image's caption or order")
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
      await patch(`/api/campaigns/${opts.campaign}/organizations/${slug}/images/${imageId}`, body)
      success(`Image ${imageId} updated.`)
    })

  cmd
    .command('image-set-primary <slug> <imageId>')
    .description("Make an image the organization's main image")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await patch(`/api/campaigns/${opts.campaign}/organizations/${slug}/images/${imageId}`, {
        isPrimary: true,
      })
      success(`Image ${imageId} is now the main image of "${slug}".`)
    })

  cmd
    .command('image-remove <slug> <imageId>')
    .description('Delete an organization gallery image')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await del(`/api/campaigns/${opts.campaign}/organizations/${slug}/images/${imageId}`)
      success(`Image ${imageId} deleted from "${slug}".`)
    })

  return cmd
}
