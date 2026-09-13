import matter from 'gray-matter'
import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
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
  visibility: z
    .enum(['public', 'members', 'editors', 'dm_only', 'private', 'specific_users'])
    .default('members'),
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
  dm: 5,
  co_dm: 4,
  editor: 3,
  player: 2,
  visitor: 1,
}

/**
 * Whether a role reads secret blocks as written, i.e. whether `stripSecretBlocks` is a
 * no-op for it. The threshold is `co_dm`, so `editor` (3) is BELOW it: an editor is served
 * filtered prose like a player. Exported so the search index can ask the question instead of
 * restating the answer — two copies of a security threshold is how they drift apart.
 */
export function seesSecretContent(userRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL['co_dm'] ?? 4)
}

/**
 * Strip :::secret{.role} and :::secret{.role:user1,user2} blocks from markdown content based
 * on the user's campaign role — and, for the user-list form, on WHO is asking.
 * DM and Co-DM always see everything.
 *
 * The three forms match `remark-strip-secrets.ts`'s doc comment exactly, because this is the
 * function every API response actually goes through (the remark plugin is unused elsewhere):
 *   :::secret{.dm}                -- DM/Co-DM only
 *   :::secret{.editor}            -- Editor+
 *   :::secret{.player:alice,bob}  -- only the listed user ids, plus DM/Co-DM
 *
 * For a user-list block, the role prefix (`player` in the example) is parsed but NOT used to
 * decide visibility — membership in the list is the only thing that grants access, exactly as
 * `remarkStripSecrets` already did. A caller with no `userId` (the shared search index, which
 * has no per-request user) can therefore never match a user-list block: it fails closed rather
 * than falling back to a role comparison, which is what silently leaked this before.
 *
 * @param userId - The id of the user the response is being rendered for. Omit it for a
 *   context with no single reader — e.g. the FILTERED search index, which is shared by every
 *   viewer and must treat every user-list block as invisible.
 * @param revealedBlockIds - Optional set of block IDs that have been explicitly revealed.
 *   If a block has an ID in this set, its content is shown without the secret wrapper
 *   (regardless of the user's role).
 */
export function stripSecretBlocks(
  content: string,
  userRole: string,
  userId?: string,
  revealedBlockIds?: Set<string>,
): string {
  if (seesSecretContent(userRole)) return content

  // Match :::secret{.SPEC} or :::secret{.SPEC #id}\n...\n:::\n patterns. SPEC may contain
  // internal whitespace (a DM typing ".player:alice, bob") — only `}` and `#` bound it, so the
  // greedy match backtracks to leave the `\s+#id` group its required leading space.
  return content.replace(
    /:::secret\{\.([^}#]+)(?:\s+#([^}]+))?\}\s*\n([\s\S]*?):::\s*\n?/g,
    (_match, rawSpec: string, blockId: string | undefined, body: string) => {
      const spec = rawSpec.trim()
      const colonIndex = spec.indexOf(':')
      const requiredRole = colonIndex !== -1 ? spec.substring(0, colonIndex).trim() : spec || 'dm'
      const allowedUsers =
        colonIndex !== -1
          ? spec
              .substring(colonIndex + 1)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []

      // If explicitly revealed, show content without the wrapper
      if (blockId && revealedBlockIds?.has(blockId)) {
        return body + '\n'
      }

      if (allowedUsers.length > 0) {
        // User-specific secret: visibility is membership in the list, full stop — the role
        // prefix is not a fallback. DM/co_dm already returned above, so this is reached only
        // by someone who is NOT one of them.
        return userId && allowedUsers.includes(userId) ? _match : ''
      }

      const requiredLevel = ROLE_LEVEL[requiredRole] ?? 5
      const userLevel = ROLE_LEVEL[userRole] ?? 0
      if (userLevel >= requiredLevel) return _match // keep the block with wrapper
      return '' // strip the block entirely
    },
  )
}

// --- File Path Resolution ---

export function resolveEntityPath(contentDir: string, type: string, slug: string): string {
  return join(contentDir, type, `${slug}.md`)
}

// --- Directory Management ---

export async function ensureCampaignDir(
  contentRoot: string,
  campaignSlug: string,
): Promise<string> {
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
    : ({
        ...data,
        type: data.type || 'unknown',
        name: data.name || 'Untitled',
      } as EntityFrontmatter)

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
    if (fm[key] === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete fm[key]
    }
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
      files.push(...(await findMarkdownFiles(fullPath)))
    } else if (extname(entry.name) === '.md') {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * `stripSecretBlocks` applied to EVERY string reachable from `value`, in place of the
 * caller having to remember which fields carry prose.
 *
 * The defect this exists for: `stripSecretBlocks` is correct but was opt-in AT THE POINT OF
 * USE, so a field only got filtered if whoever added it remembered to wrap it. Across the API
 * most did not — a character's `backstory`/`history`/`currentStatus`, a session's `summary`
 * and whole `logContent`, every `chapters`/`timelines`/`sub-campaigns` description — all
 * served `:::secret{.dm}` verbatim to players. Walking the response instead of naming fields
 * inverts the default: a field added tomorrow is filtered because nobody had to do anything.
 *
 * Idempotent, which is what makes it safe to run over already-filtered output: a second pass
 * at the same role keeps exactly the blocks the first pass kept, and a revealed block has
 * already lost its `:::secret` wrapper so it can never be re-hidden.
 *
 * Only plain objects and arrays are traversed. Dates, Buffers, Maps, Sets and class instances
 * are returned untouched — rebuilding them would corrupt the response, and none of them carry
 * markdown in this codebase. Object identity is preserved when nothing changed, so the common
 * case allocates nothing.
 */
export function stripSecretBlocksDeep<T>(
  value: T,
  userRole: string,
  userId?: string,
  revealedBlockIds?: Set<string>,
  seen: WeakSet<object> = new WeakSet(),
): T {
  // A privileged reader sees everything; skip the walk entirely.
  if ((ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL['co_dm'] ?? 4)) return value

  if (typeof value === 'string') {
    // Fast path: the overwhelming majority of strings are names, ids and timestamps.
    if (!value.includes(':::secret')) return value
    return stripSecretBlocks(value, userRole, userId, revealedBlockIds) as unknown as T
  }

  if (value === null || typeof value !== 'object') return value

  // Cycles are not expected in a JSON response, but a hook that hangs the server is a worse
  // failure than one that misses a field.
  if (seen.has(value as object)) return value
  seen.add(value as object)

  if (Array.isArray(value)) {
    let changed = false
    const out = value.map((item) => {
      const next = stripSecretBlocksDeep(item, userRole, userId, revealedBlockIds, seen)
      if (next !== item) changed = true
      return next
    })
    return (changed ? out : value) as unknown as T
  }

  // Anything that is not a plain object (Date, Buffer, Map, class instance) is left alone.
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return value

  let changed = false
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const next = stripSecretBlocksDeep(val, userRole, userId, revealedBlockIds, seen)
    if (next !== val) changed = true
    out[key] = next
  }
  return (changed ? out : value) as unknown as T
}
