import { Server } from '@hocuspocus/server'
import { useSqlite, useDb } from '../utils/db'
import { markdownToTiptap, tiptapToMarkdown, mergeFrontmatter } from '../services/collaboration'
import { readEntityFile, writeEntityFile, contentHash } from '../services/content'
import { indexEntity } from '../services/search'
import { auth } from '../utils/auth'
import { logger } from '../utils/logger'
import { eq, and } from 'drizzle-orm'
import { entities } from '../db/schema/entities'
import { campaignMembers } from '../db/schema/campaign-members'

let server: Server | null = null

export default defineNitroPlugin(async () => {
  try {
    server = Server.configure({
      port: 3334,
      quiet: true,

      async onAuthenticate({ token, documentName }) {
        if (!token) throw new Error('No auth token')

        // Validate session via Better Auth
        const session = await auth.api.getSession({
          headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
        })
        if (!session) throw new Error('Invalid session')

        // Parse document name: campaign:{id}:entity:{slug}
        const parts = documentName.split(':')
        if (parts.length !== 4 || parts[0] !== 'campaign' || parts[2] !== 'entity') {
          throw new Error('Invalid document name format')
        }
        const campaignId = parts[1]

        // Check campaign membership
        const membership = useDb().select()
          .from(campaignMembers)
          .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, session.user.id)))
          .get()

        if (!membership) throw new Error('Not a campaign member')

        // Players can view but need editor+ to edit
        const editRoles = ['dm', 'co_dm', 'editor']
        if (!editRoles.includes(membership.role)) {
          throw new Error('Insufficient permissions to edit')
        }

        return { user: session.user, campaignId, role: membership.role }
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
        } catch (err) {
          logger.error('Hocuspocus: failed to save document', { documentName, error: err })
        }
      },

      onDisconnect({ context }) {
        logger.debug('Hocuspocus: user disconnected', { user: context?.user?.name })
      },
    })

    server.listen()
    logger.info('Hocuspocus collaboration server started on port 3334')
  } catch (err) {
    logger.warn('Hocuspocus: failed to start (collaboration disabled)', { error: err })
  }
})
