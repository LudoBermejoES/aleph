import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { gameSessions, sessionContents } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'
import {
  generateText,
  isAiConfigured,
  SUMMARY_SYSTEM_PROMPT,
  AI_NOTES_SYSTEM_PROMPT,
} from '../../../../../utils/ai'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can generate session content' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!

  const bodySchema = z.object({
    target: z.enum(['summary', 'ai_notes']),
  })
  const body = await validateBody(event, bodySchema)

  const db = useDb()

  const session = db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const manualNotes = db
    .select({ content: sessionContents.content })
    .from(sessionContents)
    .where(and(eq(sessionContents.sessionId, session.id), eq(sessionContents.type, 'manual_notes')))
    .get()
  if (!manualNotes?.content?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Manual notes are empty — write session notes first',
    })
  }

  if (!isAiConfigured()) {
    throw createError({
      statusCode: 503,
      message: 'AI provider is not configured — contact your admin',
    })
  }

  // Cooldown: reject if target content was updated within the last 60 seconds
  const targetContent = db
    .select({ id: sessionContents.id, updatedAt: sessionContents.updatedAt })
    .from(sessionContents)
    .where(and(eq(sessionContents.sessionId, session.id), eq(sessionContents.type, body.target)))
    .get()
  if (targetContent?.updatedAt) {
    const updatedAt = new Date(targetContent.updatedAt).getTime()
    if (Date.now() - updatedAt < 60_000) {
      throw createError({ statusCode: 429, message: 'Please wait before generating again' })
    }
  }

  const systemPrompt = body.target === 'summary' ? SUMMARY_SYSTEM_PROMPT : AI_NOTES_SYSTEM_PROMPT
  const generated = await generateText(manualNotes.content, systemPrompt)

  const now = new Date()
  if (targetContent) {
    db.update(sessionContents)
      .set({ content: generated, updatedAt: now })
      .where(eq(sessionContents.id, targetContent.id))
      .run()
  } else {
    db.insert(sessionContents)
      .values({
        id: randomUUID(),
        sessionId: session.id,
        type: body.target,
        content: generated,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  return { target: body.target, content: generated }
})
