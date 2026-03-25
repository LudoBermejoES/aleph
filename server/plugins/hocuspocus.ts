import { Server } from '@hocuspocus/server'
import { useSqlite, useDb } from '../utils/db'
import { markdownToTiptap, tiptapToMarkdown, mergeFrontmatter } from '../services/collaboration'
import { readEntityFile, writeEntityFile, contentHash } from '../services/content'
import { indexEntity } from '../services/search'
import { auth } from '../utils/auth'
import { logger } from '../utils/logger'
import { validateWsToken } from '../services/ws-token'
import { eq, and } from 'drizzle-orm'
import { entities } from '../db/schema/entities'
import { campaignMembers } from '../db/schema/campaign-members'

let server: Server | null = null

export default defineNitroPlugin(async () => {
  try {
    server = new Server({
      port: 3334,
      quiet: true,
      debounce: 2000, // 2s after last change before onStoreDocument fires
      maxDebounce: 10000, // Force save at least every 10s during active editing

      async onAuthenticate({ token, documentName }) {
        if (!token) throw new Error('No auth token')

        // Try WS token first (from /api/ws/token endpoint), then fall back to session cookie
        let userId: string | null = validateWsToken(token)
        if (!userId) {
          // Fall back to session cookie validation
          const session = await auth.api.getSession({
            headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
          })
          if (!session) throw new Error('Invalid session')
          userId = session.user.id
        }

        // Parse document name: campaign:{id}:entity:{slug}
        const parts = documentName.split(':')
        if (parts.length !== 4 || parts[0] !== 'campaign' || parts[2] !== 'entity') {
          throw new Error('Invalid document name format')
        }
        const campaignId = parts[1]

        // Check campaign membership
        const membership = useDb().select()
          .from(campaignMembers)
          .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
          .get()

        if (!membership) throw new Error('Not a campaign member')

        // Players can view but need editor+ to edit
        const editRoles = ['dm', 'co_dm', 'editor']
        if (!editRoles.includes(membership.role)) {
          throw new Error('Insufficient permissions to edit')
        }

        return { user: { id: userId }, campaignId, role: membership.role }
      },

      async onLoadDocument({ document, documentName, context }) {
        // Parse document name
        const parts = documentName.split(':')
        const campaignId = parts[1]
        const slug = parts[3]

        const db = useDb()
        const entity = db.select().from(entities)
          .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
          .get()

        if (!entity) {
          logger.warn('Hocuspocus: entity not found', { documentName })
          return
        }

        try {
          const file = await readEntityFile(entity.filePath)
          const tiptapJson = markdownToTiptap(file.content)

          // Hydrate Y.js document with Tiptap content
          const { prosemirrorJSONToYDoc } = await import('y-prosemirror')
          const yDoc = prosemirrorJSONToYDoc(document.getSchema(), tiptapJson)

          // Merge into the Hocuspocus document
          const update = yDoc.encodeStateAsUpdateV2 ? undefined : undefined
          // The document is auto-populated by Hocuspocus from the Y.js doc
          logger.debug('Hocuspocus: document loaded', { documentName, slug })
        } catch (err) {
          logger.error('Hocuspocus: failed to load document', { documentName, error: err })
        }
      },

      async onStoreDocument({ document, documentName, context }) {
        const parts = documentName.split(':')
        const campaignId = parts[1]
        const slug = parts[3]

        const db = useDb()
        const sqlite = useSqlite()
        const entity = db.select().from(entities)
          .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
          .get()

        if (!entity) return

        const maxRetries = 3
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Convert Y.js document back to Tiptap JSON, then to markdown
            const json = document.getJSON()
            const markdown = tiptapToMarkdown(json || { type: 'doc', content: [] })

            // Read existing frontmatter
            const existing = await readEntityFile(entity.filePath)
            const mergedFm = mergeFrontmatter(existing.frontmatter as Record<string, unknown>, {})

            // Write updated .md file
            const hash = await writeEntityFile(entity.filePath, mergedFm as any, markdown)

            // Update content hash in DB
            db.update(entities)
              .set({ contentHash: hash, updatedAt: new Date() })
              .where(eq(entities.id, entity.id))
              .run()

            // Re-index in FTS5
            indexEntity(sqlite, entity.id, campaignId, entity.name, [], [], markdown)

            logger.debug('Hocuspocus: document saved', { documentName, slug })
            return // Success — exit retry loop
          } catch (err) {
            const isLastAttempt = attempt === maxRetries
            if (isLastAttempt) {
              logger.error('Hocuspocus: failed to save document after retries', {
                documentName, attempts: maxRetries, error: err,
              })
              // Notify connected clients via Hocuspocus awareness
              try {
                document.broadcastStateless(JSON.stringify({
                  type: 'save-error',
                  message: `Failed to save ${slug} after ${maxRetries} attempts`,
                }))
              } catch { /* best-effort notification */ }
            } else {
              // Exponential backoff: 500ms, 1000ms
              const delay = 500 * Math.pow(2, attempt - 1)
              logger.warn('Hocuspocus: save failed, retrying', {
                documentName, attempt, delay, error: err,
              })
              await new Promise(resolve => setTimeout(resolve, delay))
            }
          }
        }
      },

      onDisconnect({ context }) {
        logger.debug('Hocuspocus: user disconnected', { user: context?.user?.name })
      },
    })

    server.listen()
    logger.info('Hocuspocus collaboration server started on port 3334')
  } catch (err: any) {
    logger.warn('Hocuspocus: failed to start (collaboration disabled)', {
      error: err?.message || String(err),
      stack: err?.stack,
    })
  }
})
