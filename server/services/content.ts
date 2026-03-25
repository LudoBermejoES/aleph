import matter from 'gray-matter'
import { readFile, writeFile, unlink, readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, dirname } from 'path'
import { createHash } from 'crypto'
import { z } from 'zod'

// --- Zod Schemas ---

export const baseEntityFrontmatter = z.object({
  id: z.string().uuid().optional(),
  type: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['public', 'members', 'editors', 'dm_only', 'private', 'specific_users']).default('members'),
  template: z.string().optional(),
  parent: z.string().optional(),
  created: z.string().optional(),
  modified: z.string().optional(),
  fields: z.record(z.string(), z.any()).default({}),
})

export type EntityFrontmatter = z.infer<typeof baseEntityFrontmatter>

export interface EntityFile {
  frontmatter: EntityFrontmatter
  content: string
  filePath: string
  contentHash: string
}

// --- Slug Generation ---

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Content Hash ---

export function contentHash(content: string): string {
  return createHash('md5').update(content).digest('hex')
}

// --- Secret Block Stripping ---

const ROLE_LEVEL: Record<string, number> = {
  dm: 5, co_dm: 4, editor: 3, player: 2, visitor: 1,
}

/**
 * Strip :::secret{.role} blocks from markdown content based on the user's campaign role.
 * DM and Co-DM always see everything.
 */
export function stripSecretBlocks(content: string, userRole: string): string {
  if ((ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL['co_dm'] ?? 4)) return content

  // Match :::secret{.SPEC}\n...\n:::\n patterns
  return content.replace(
    /:::secret\{\.([^}]*)\}\s*\n([\s\S]*?):::\s*\n?/g,
    (_match, spec: string, _body: string) => {
      const colonIndex = spec.indexOf(':')
      const requiredRole = colonIndex !== -1 ? spec.substring(0, colonIndex) : (spec || 'dm')
      const requiredLevel = ROLE_LEVEL[requiredRole] ?? 5
      const userLevel = ROLE_LEVEL[userRole] ?? 0

      if (userLevel >= requiredLevel) return _match // keep the block
      return '' // strip the block
    },
  )
}

// --- File Path Resolution ---

export function resolveEntityPath(contentDir: string, type: string, slug: string): string {
  return join(contentDir, type, `${slug}.md`)
}

// --- Directory Management ---

export async function ensureCampaignDir(contentRoot: string, campaignSlug: string): Promise<string> {
  const dir = join(contentRoot, 'campaigns', campaignSlug)
  await mkdir(dir, { recursive: true })
  return dir
}

export async function ensureTypeDir(campaignDir: string, type: string): Promise<string> {
  const dir = join(campaignDir, type)
  await mkdir(dir, { recursive: true })
  return dir
}

// --- Read ---

export async function readEntityFile(filePath: string): Promise<EntityFile> {
  const raw = await readFile(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const parsed = baseEntityFrontmatter.safeParse(data)
  const frontmatter = parsed.success
    ? parsed.data
    : { ...data, type: data.type || 'unknown', name: data.name || 'Untitled' } as EntityFrontmatter

  return {
    frontmatter,
    content,
    filePath,
    contentHash: contentHash(raw),
  }
}

// --- Write ---

export async function writeEntityFile(
  filePath: string,
  frontmatter: EntityFrontmatter,
  content: string,
): Promise<string> {
  await mkdir(dirname(filePath), { recursive: true })

  const now = new Date().toISOString()
  const fm: Record<string, unknown> = {
    ...frontmatter,
    modified: now,
    created: frontmatter.created || now,
  }

  // Strip undefined values (gray-matter/js-yaml cannot serialize them)
  for (const key of Object.keys(fm)) {
    if (fm[key] === undefined) delete fm[key]
  }

  const markdown = matter.stringify(content, fm)
  await writeFile(filePath, markdown, 'utf-8')
  return contentHash(markdown)
}

// --- Delete ---

export async function deleteEntityFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath)
  }
}

// --- Find All ---

export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath))
    } else if (extname(entry.name) === '.md') {
      files.push(fullPath)
    }
  }

  return files
}
