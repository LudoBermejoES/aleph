import { Server } from '@hocuspocus/server'
import { useSqlite, useDb } from '../utils/db'
import { markdownToTiptap, tiptapToMarkdown, mergeFrontmatter } from '../services/collaboration'
import { readEntityFile, writeEntityFile } from '../services/content'
import { indexEntity } from '../services/search'
import { auth } from '../utils/auth'
import { logger } from '../utils/logger'
import { validateWsToken } from '../services/ws-token'
import { eq, and } from 'drizzle-orm'
import { entities } from '../db/schema/entities'
import { gameSessions, quests } from '../db/schema/sessions'
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

        // Parse document name: campaign:{id}:{type}:{slug}
        // Supported types: entity, session, quest
        const parts = documentName.split(':')
        const VALID_DOC_TYPES = ['entity', 'session', 'quest']
        if (parts.length !== 4 || parts[0] !== 'campaign' || !VALID_DOC_TYPES.includes(parts[2]!)) {
          throw new Error('Invalid document name format')
        }
        const campaignId = parts[1]!

        // Check campaign membership
        const membership = useDb()
          .select()
          .from(campaignMembers)
          .where(
            and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)),
          )
          .get()

        if (!membership) throw new Error('Not a campaign member')

        // Players can view but need editor+ to edit
        const editRoles = ['dm', 'co_dm', 'editor']
        if (!editRoles.includes(membership.role)) {
          throw new Error('Insufficient permissions to edit')
        }

        return { user: { id: userId }, campaignId, role: membership.role }
      },

      async onLoadDocument({ document, documentName, _context }) {
        // Parse document name
        const parts = documentName.split(':')
        const campaignId = parts[1]!
        const docType = parts[2]!
        const slug = parts[3]!

        const db = useDb()
        let filePath: string | null = null

        if (docType === 'entity') {
          const entity = db
            .select()
            .from(entities)
            .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
            .get()
          if (!entity) {
            logger.warn('Hocuspocus: entity not found', { documentName })
            return
          }
          filePath = entity.filePath
        } else if (docType === 'session') {
          const session = db
            .select()
            .from(gameSessions)
            .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
            .get()
          if (!session) {
            logger.warn('Hocuspocus: session not found', { documentName })
            return
          }
          filePath = session.logFilePath ?? null
        } else if (docType === 'quest') {
          const quest = db
            .select()
            .from(quests)
            .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
            .get()
          if (!quest) {
            logger.warn('Hocuspocus: quest not found', { documentName })
            return
          }
          filePath = quest.logFilePath ?? null
        }

        if (!filePath) {
          logger.debug('Hocuspocus: no file path for document, starting empty', { documentName })
          return
        }

        try {
          const file = await readEntityFile(filePath)
          const tiptapJson = markdownToTiptap(file.content)

          // Hydrate Y.js document with Tiptap content
          const { prosemirrorJSONToYDoc } = await import('y-prosemirror')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Hocuspocus types don't expose getSchema()
          const yDoc = prosemirrorJSONToYDoc((document as any).getSchema(), tiptapJson)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Yjs types
          const _update = (yDoc as any).encodeStateAsUpdateV2 ? undefined : undefined
          logger.debug('Hocuspocus: document loaded', { documentName, slug })
        } catch (err) {
          logger.error('Hocuspocus: failed to load document', { documentName, error: err })
        }
      },

      async onStoreDocument({ document, documentName, _context }) {
        const parts = documentName.split(':')
        const campaignId = parts[1]!
        const docType = parts[2]!
        const slug = parts[3]!

        const db = useDb()
        const sqlite = useSqlite()

        // Resolve record and file path based on document type
        let filePath: string | null = null
        let entityId: string | null = null
        let entityName: string | null = null

        if (docType === 'entity') {
          const entity = db
            .select()
            .from(entities)
            .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
            .get()
          if (!entity) return
          filePath = entity.filePath
          entityId = entity.id
          entityName = entity.name
        } else if (docType === 'session') {
          const session = db
            .select()
            .from(gameSessions)
            .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
            .get()
          if (!session || !session.logFilePath) return
          filePath = session.logFilePath
        } else if (docType === 'quest') {
          const quest = db
            .select()
            .from(quests)
            .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
            .get()
          if (!quest || !quest.logFilePath) return
          filePath = quest.logFilePath
        }

        if (!filePath) return

        const maxRetries = 3
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Convert Y.js document back to Tiptap JSON, then to markdown
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Hocuspocus types don't expose getJSON()
            const json = (document as any).getJSON()
            const markdown = tiptapToMarkdown(json || { type: 'doc', content: [] })

            // Read existing frontmatter and write updated file
            const existing = await readEntityFile(filePath)
            const mergedFm = mergeFrontmatter(existing.frontmatter as Record<string, unknown>, {})
            const hash = await writeEntityFile(
              filePath,
              mergedFm as Record<string, unknown>,
              markdown,
            )

            if (docType === 'entity' && entityId && entityName) {
              // Update content hash in DB and re-index in FTS5
              db.update(entities)
                .set({ contentHash: hash, updatedAt: new Date() })
                .where(eq(entities.id, entityId))
                .run()
              indexEntity(sqlite, entityId, campaignId, entityName, [], [], markdown)
            }

            logger.debug('Hocuspocus: document saved', { documentName, slug })
            return // Success — exit retry loop
          } catch (err) {
            const isLastAttempt = attempt === maxRetries
            if (isLastAttempt) {
              logger.error('Hocuspocus: failed to save document after retries', {
                documentName,
                attempts: maxRetries,
                error: err,
              })
              try {
                document.broadcastStateless(
                  JSON.stringify({
                    type: 'save-error',
                    message: `Failed to save ${slug} after ${maxRetries} attempts`,
                  }),
                )
              } catch {
                /* best-effort notification */
              }
            } else {
              const delay = 500 * Math.pow(2, attempt - 1)
              logger.warn('Hocuspocus: save failed, retrying', {
                documentName,
                attempt,
                delay,
                error: err,
              })
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }
      },

      async onDisconnect({ _context }) {
        logger.debug('Hocuspocus: user disconnected')
      },
    })

    server.listen()
    logger.info('Hocuspocus collaboration server started on port 3334')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    logger.warn('Hocuspocus: failed to start (collaboration disabled)', {
      error: message,
      stack,
    })
  }
})
