import { Command } from 'commander'
import { get, post, put, del, patch, postMultipart, resolveEntitySlug } from '../lib/client.js'
import { print, success, info } from '../lib/output.js'
import { existsSync } from 'fs'

/**
 * Render a genealogy tree as an ASCII indented list.
 * Spouse pairs appear on the same line joined with " = ".
 * Nodes are sorted by generation then by x coordinate.
 */
function renderAsciiTree(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    process.stdout.write('(empty tree)\n')
    return
  }

  const spouseEdges = edges.filter((e) => e.type === 'spouse_of')
  const spouseOf = new Map()
  for (const e of spouseEdges) {
    spouseOf.set(e.sourceEntityId, e.targetEntityId)
    spouseOf.set(e.targetEntityId, e.sourceEntityId)
  }

  const byGeneration = new Map()
  for (const node of nodes) {
    if (!byGeneration.has(node.generation)) byGeneration.set(node.generation, [])
    byGeneration.get(node.generation).push(node)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const placed = new Set()

  for (const gen of generations) {
    const indent = '  '.repeat(Math.abs(gen))
    const genNodes = byGeneration.get(gen).sort((a, b) => a.x - b.x)
    for (const node of genNodes) {
      if (placed.has(node.entityId)) continue
      placed.add(node.entityId)
      const spouseId = spouseOf.get(node.entityId)
      const spouse = spouseId
        ? nodes.find((n) => n.entityId === spouseId && n.generation === gen)
        : null
      let line = formatNodeLabel(node)
      if (spouse && !placed.has(spouse.entityId)) {
        placed.add(spouse.entityId)
        line += ` = ${formatNodeLabel(spouse)}`
      }
      process.stdout.write(`${indent}${line}\n`)
    }
  }
}

/** Render a note timestamp; the server sends epoch millis for `updatedAt`. */
function formatNoteDate(value) {
  if (value === null || value === undefined) return '?'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString()
}

function formatNodeLabel(node) {
  let label = node.name
  if (node.birthYear !== null || node.deathYear !== null) {
    const b = node.birthYear ?? '?'
    const d = node.deathYear != null ? `–${node.deathYear}` : ''
    label += ` (${b}${d})`
  }
  return label
}

export function makeCharacterCommand() {
  const cmd = new Command('character').description('Manage characters')

  cmd
    .command('list')
    .description('List characters in a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--status <status>', 'Filter by status (alive, dead, missing, unknown)')
    .option('--sort <field>', 'Sort field (name, updatedAt, status)')
    .option('--sort-dir <dir>', 'Sort direction (asc, desc)')
    .option('--page <n>', 'Page number', '1')
    .option('--limit <n>', 'Results per page (0 = all)', '50')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const params = new URLSearchParams()
      if (opts.status) params.set('status', opts.status)
      if (opts.sort) params.set('sort', opts.sort)
      if (opts.sortDir) params.set('sortDir', opts.sortDir)
      params.set('page', opts.page)
      params.set('pageSize', opts.limit)
      const qs = params.toString()
      const res = await get(`/api/campaigns/${opts.campaign}/characters${qs ? `?${qs}` : ''}`)
      const data = Array.isArray(res) ? res : res.data
      const meta = Array.isArray(res) ? null : res.meta
      if (opts.json) {
        print(res, { json: true })
      } else {
        print(
          data.map((c) => ({
            name: c.name,
            slug: c.slug,
            type: c.characterType || '',
            status: c.status || '',
          })),
        )
        if (meta) console.error(`Page ${meta.page}/${meta.totalPages} (${meta.total} total)`)
      }
    })

  cmd
    .command('create')
    .description('Create a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--name <name>', 'Character name')
    .option('--type <type>', 'Character type: pc or npc (default: npc)')
    .option('--status <status>', 'Initial status (alive, dead, missing, unknown)')
    .option('--gender <gender>', 'Gender (free text)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const body = { name: opts.name }
      if (opts.type !== undefined) body.characterType = opts.type
      if (opts.status !== undefined) body.status = opts.status
      if (opts.gender !== undefined) body.gender = opts.gender
      const data = await post(`/api/campaigns/${opts.campaign}/characters`, body)
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
          portrait: data.portraitUrl || '(none)',
        })
      }
    })

  cmd
    .command('update <slug>')
    .description('Update character fields and/or content')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'Character name')
    .option('--status <status>', 'Status (alive, dead, missing, unknown)')
    .option('--type <type>', 'Character type (pc, npc)')
    .option('--template-id <id>', 'Template ID to assign to this character')
    .option('--fields <json>', 'Template field values as JSON string')
    .option('--content <markdown>', 'Markdown content (physical description)')
    .option('--stdin', 'Read description from stdin')
    .option('--backstory <markdown>', 'Character backstory (markdown)')
    .option('--backstory-stdin', 'Read backstory from stdin')
    .option('--history <markdown>', 'Character history log (markdown)')
    .option('--history-stdin', 'Read history from stdin')
    .option('--current-status <markdown>', 'Current status after last session (markdown)')
    .option('--current-status-stdin', 'Read current status from stdin')
    .option('--birth-year <year>', 'Birth year (integer)')
    .option('--death-year <year>', 'Death year (integer, "" to clear)')
    .option('--gender <gender>', 'Gender (free text, "" to clear)')
    .option('--owner <userId>', 'Owner user ID ("" to clear)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      if (opts.content && opts.stdin) {
        process.stderr.write('Error: --content and --stdin are mutually exclusive\n')
        process.exit(1)
      }
      if (opts.backstory && opts.backstoryStdin) {
        process.stderr.write('Error: --backstory and --backstory-stdin are mutually exclusive\n')
        process.exit(1)
      }
      if (opts.history && opts.historyStdin) {
        process.stderr.write('Error: --history and --history-stdin are mutually exclusive\n')
        process.exit(1)
      }
      if (opts.currentStatus && opts.currentStatusStdin) {
        process.stderr.write(
          'Error: --current-status and --current-status-stdin are mutually exclusive\n',
        )
        process.exit(1)
      }
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      if (opts.status !== undefined) body.status = opts.status
      if (opts.type !== undefined) body.characterType = opts.type
      if (opts.templateId !== undefined) body.templateId = opts.templateId
      if (opts.fields !== undefined) {
        try {
          body.fields = JSON.parse(opts.fields)
        } catch {
          process.stderr.write('Error: --fields must be valid JSON\n')
          process.exit(1)
        }
      }
      if (opts.birthYear !== undefined) {
        body.birthYear = opts.birthYear === '' ? null : parseInt(opts.birthYear, 10)
      }
      if (opts.deathYear !== undefined) {
        body.deathYear = opts.deathYear === '' ? null : parseInt(opts.deathYear, 10)
      }
      if (opts.gender !== undefined) {
        body.gender = opts.gender === '' ? null : opts.gender
      }
      if (opts.owner !== undefined) {
        body.ownerUserId = opts.owner === '' ? null : opts.owner
      }
      async function readStdin() {
        return new Promise((resolve) => {
          let data = ''
          process.stdin.setEncoding('utf8')
          process.stdin.on('data', (chunk) => {
            data += chunk
          })
          process.stdin.on('end', () => resolve(data))
        })
      }
      if (opts.stdin) {
        body.content = await readStdin()
      } else if (opts.content !== undefined) {
        body.content = opts.content
      }
      if (opts.backstoryStdin) {
        body.backstory = await readStdin()
      } else if (opts.backstory !== undefined) {
        body.backstory = opts.backstory
      }
      if (opts.historyStdin) {
        body.history = await readStdin()
      } else if (opts.history !== undefined) {
        body.history = opts.history
      }
      if (opts.currentStatusStdin) {
        body.currentStatus = await readStdin()
      } else if (opts.currentStatus !== undefined) {
        body.currentStatus = opts.currentStatus
      }
      if (Object.keys(body).length === 0) {
        process.stderr.write(
          'Error: provide at least one field to update (--name, --status, --type, --template-id, --fields, --backstory, --history, --current-status, --birth-year, --death-year, --gender, --owner, --content, --stdin)\n',
        )
        process.exit(1)
      }
      const data = await put(`/api/campaigns/${opts.campaign}/characters/${slug}`, body)
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Character updated: ${slug}`)
      }
    })

  // ─── Public notes ───────────────────────────────────────────────────────────
  // A note is per (character, author). `notes` reads every note on the character; `note-set`
  // writes only the authenticated key's own note, via `/notes/me`. There is deliberately no
  // flag that addresses another member's note — the route shape does not allow it.

  cmd
    .command('notes <slug>')
    .description("List every public note on a character, with each note's author")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters/${slug}`)
      const notes = data.notes ?? []
      if (opts.json) {
        print(notes, { json: true })
        return
      }
      if (notes.length === 0) {
        info('(no notes)')
        return
      }
      for (const n of notes) {
        console.log(`── ${n.authorName ?? n.authorUserId} (${formatNoteDate(n.updatedAt)})`)
        console.log(n.body)
        console.log('')
      }
    })

  cmd
    .command('note-show <slug>')
    .description("Show the authenticated user's own note on a character")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters/${slug}/notes/me`)
      if (opts.json) {
        print(data, { json: true })
      } else if (!data.note) {
        info('(no note)')
      } else {
        console.log(data.note.body)
      }
    })

  cmd
    .command('note-set <slug>')
    .description("Write the authenticated user's own public note on a character")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--body <markdown>', 'Note body (markdown)')
    .option('--stdin', 'Read the note body from stdin')
    .option('--clear', 'Delete the note (equivalent to an empty body)')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const sources = [opts.body !== undefined, !!opts.stdin, !!opts.clear].filter(Boolean).length
      if (sources !== 1) {
        process.stderr.write('Error: provide exactly one of --body, --stdin or --clear\n')
        process.exit(1)
      }
      let body = ''
      if (opts.stdin) {
        body = await new Promise((resolve) => {
          let data = ''
          process.stdin.setEncoding('utf8')
          process.stdin.on('data', (chunk) => {
            data += chunk
          })
          process.stdin.on('end', () => resolve(data))
        })
      } else if (opts.body !== undefined) {
        body = opts.body
      }
      // An empty or whitespace-only body deletes the note server-side — that is what --clear is
      const data = await put(`/api/campaigns/${opts.campaign}/characters/${slug}/notes/me`, {
        body,
      })
      if (opts.json) {
        print(data, { json: true })
      } else if (data.note) {
        success(`Note saved on ${slug}`)
      } else {
        success(`Note removed from ${slug}`)
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

  cmd
    .command('connect <slug>')
    .description('Connect a character to an entity')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--target <slug>', 'Target entity slug')
    .option('--label <text>', 'Connection label')
    .option('--description <text>', 'Connection description')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const targetEntityId = await resolveEntitySlug(opts.campaign, opts.target)
      const body = { targetEntityId }
      if (opts.label !== undefined) body.label = opts.label
      if (opts.description !== undefined) body.description = opts.description
      const data = await post(
        `/api/campaigns/${opts.campaign}/characters/${slug}/connections`,
        body,
      )
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Connection created: ${data.id}`)
      }
    })

  cmd
    .command('connections <slug>')
    .description('List connections for a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters/${slug}/connections`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        const entityRes = await get(`/api/campaigns/${opts.campaign}/entities?limit=500`)
        const allEntities = Array.isArray(entityRes) ? entityRes : (entityRes.entities ?? [])
        const nameMap = Object.fromEntries(allEntities.map((e) => [e.id, e.name]))
        print(
          data.map((c) => ({
            id: c.id,
            target: nameMap[c.targetEntityId] ?? c.targetEntityId,
            label: c.label || '',
            description: c.description || '',
          })),
        )
      }
    })

  cmd
    .command('connection-delete <slug> <connectionId>')
    .description('Delete a connection from a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (slug, connectionId, opts) => {
      if (!opts.yes) {
        const { createInterface } = await import('readline')
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        const answer = await new Promise((resolve) =>
          rl.question(`Delete connection ${connectionId}? (y/N) `, resolve),
        )
        rl.close()
        if (answer.toLowerCase() !== 'y') {
          process.stdout.write('Aborted.\n')
          process.exit(0)
        }
      }
      await del(`/api/campaigns/${opts.campaign}/characters/${slug}/connections/${connectionId}`)
      success(`Connection deleted: ${connectionId}`)
    })

  cmd
    .command('ability-delete <slug> <abilityId>')
    .description('Delete an ability from a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, abilityId, opts) => {
      if (!opts.yes) {
        const { confirm } = await import('@inquirer/prompts')
        const ok = await confirm({
          message: `Delete ability ${abilityId} from ${slug}?`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/characters/${slug}/abilities/${abilityId}`)
      success(`Ability ${abilityId} deleted.`)
    })

  cmd
    .command('family-add <slug>')
    .description('Add a family link to a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--type <type>', 'Link type: parent, child, spouse, sibling')
    .requiredOption('--target <slug>', 'Target character slug')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/characters/${slug}/family`, {
        type: opts.type,
        targetCharacterSlug: opts.target,
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success(`Family link created: ${data.id}`)
        if (data.warnings && data.warnings.length > 0) {
          for (const w of data.warnings) process.stderr.write(`Warning: ${w}\n`)
        }
      }
    })

  cmd
    .command('family-remove <slug> <relationId>')
    .description('Remove a family link from a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (slug, relationId, opts) => {
      if (!opts.yes) {
        const { confirm } = await import('@inquirer/prompts')
        const ok = await confirm({ message: `Remove family link ${relationId}?`, default: false })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/characters/${slug}/family/${relationId}`)
      success(`Family link removed: ${relationId}`)
    })

  cmd
    .command('genealogy <slug>')
    .description('View genealogy tree for a character')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--depth <n>', 'Tree depth (default 3, max 10)', '3')
    .option('--format <fmt>', 'Output format: ascii or json', 'ascii')
    .action(async (slug, opts) => {
      const depth = parseInt(opts.depth, 10) || 3
      const data = await get(
        `/api/campaigns/${opts.campaign}/characters/${slug}/genealogy?depth=${depth}`,
      )
      if (opts.format === 'json') {
        print(data, { json: true })
      } else {
        renderAsciiTree(data.nodes, data.edges)
      }
    })

  cmd
    .command('folder-update <folderId>')
    .description('Update a character folder')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--name <name>', 'New folder name')
    .action(async (folderId, opts) => {
      const body = {}
      if (opts.name !== undefined) body.name = opts.name
      await put(`/api/campaigns/${opts.campaign}/character-folders/${folderId}`, body)
      success('Folder updated.')
    })

  cmd
    .command('folder-delete <folderId>')
    .description('Delete a character folder')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--yes', 'Skip confirmation')
    .action(async (folderId, opts) => {
      if (!opts.yes) {
        const { confirm } = await import('@inquirer/prompts')
        const ok = await confirm({
          message: `Delete folder ${folderId}? This cannot be undone.`,
          default: false,
        })
        if (!ok) {
          process.stdout.write('Cancelled.\n')
          return
        }
      }
      await del(`/api/campaigns/${opts.campaign}/character-folders/${folderId}`)
      success(`Folder ${folderId} deleted.`)
    })

  cmd
    .command('images <slug>')
    .description("List a character's gallery images")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/characters/${slug}/images`)
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
    .description("Upload an image to a character's gallery")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--file <path>', 'Path to image file (png, jpg, webp)')
    .option('--caption <text>', 'Caption for the image')
    .option('--json', 'Output as JSON')
    .action(async (slug, opts) => {
      const data = await postMultipart(
        `/api/campaigns/${opts.campaign}/characters/${slug}/images`,
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
    .description("Update a character gallery image's caption or order")
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
      await patch(`/api/campaigns/${opts.campaign}/characters/${slug}/images/${imageId}`, body)
      success(`Image ${imageId} updated.`)
    })

  cmd
    .command('image-set-primary <slug> <imageId>')
    .description("Make an image the character's main portrait")
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await patch(`/api/campaigns/${opts.campaign}/characters/${slug}/images/${imageId}`, {
        isPrimary: true,
      })
      success(`Image ${imageId} is now the main portrait of "${slug}".`)
    })

  cmd
    .command('image-remove <slug> <imageId>')
    .description('Delete a character gallery image')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .action(async (slug, imageId, opts) => {
      await del(`/api/campaigns/${opts.campaign}/characters/${slug}/images/${imageId}`)
      success(`Image ${imageId} deleted from "${slug}".`)
    })

  return cmd
}
