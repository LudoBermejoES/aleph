import { db, sqlite } from '../../db'
import { entities, entityNames } from '../../db/schema'
import { slugify } from '../../utils/markdown'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { createHash } from 'crypto'
import matter from 'gray-matter'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, type, campaignId, content, visibility, aliases, tags } = body

  const id = randomUUID()
  const slug = slugify(name)
  const now = new Date()

  // Build the markdown file with frontmatter
  const frontmatter = {
    id,
    type,
    name,
    aliases: aliases || [],
    tags: tags || [],
    visibility: visibility || 'members',
    created: now.toISOString(),
    modified: now.toISOString(),
  }

  const markdown = matter.stringify(content || '', frontmatter)
  const contentHash = createHash('md5').update(markdown).digest('hex')

  // Write .md file to content directory
  const contentDir = join(process.cwd(), 'content', 'campaigns', campaignId, type)
  await mkdir(contentDir, { recursive: true })
  const filePath = join(contentDir, `${slug}.md`)
  await writeFile(filePath, markdown, 'utf-8')

  // Insert metadata into SQLite
  db.insert(entities).values({
    id,
    campaignId,
    type,
    name,
    slug,
    filePath,
    visibility: visibility || 'members',
    contentHash,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Insert entity names for auto-linking
  db.insert(entityNames).values({
    id: randomUUID(),
    entityId: id,
    name,
    nameLower: name.toLowerCase(),
    isPrimary: 1,
  }).run()

  // Insert aliases
  for (const alias of (aliases || [])) {
    db.insert(entityNames).values({
      id: randomUUID(),
      entityId: id,
      name: alias,
      nameLower: alias.toLowerCase(),
      isPrimary: 0,
    }).run()
  }

  // Index in FTS5
  const row = sqlite.prepare('SELECT rowid FROM entities WHERE id = ?').get(id) as { rowid: number } | undefined
  sqlite.prepare(`
    INSERT INTO entities_fts (rowid, name, aliases, tags, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    row?.rowid,
    name,
    (aliases || []).join(' '),
    (tags || []).join(' '),
    content || ''
  )

  return { id, slug, filePath }
})
