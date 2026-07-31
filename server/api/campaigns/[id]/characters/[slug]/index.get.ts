import { eq, desc } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { user } from '../../../../../db/schema/auth'
import {
  characterStats,
  statDefinitions,
  statGroups,
  abilities,
  characterNotes,
} from '../../../../../db/schema/characters'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import {
  stripSecretStats,
  stripSecretAbilities,
  resolveReadableCharacter,
} from '../../../../../services/characters'
import { autoLinkContent } from '../../../../../services/autolink-render'
import type { CampaignRole } from '../../../../../utils/permissions'
import { hasMinRole } from '../../../../../utils/permissions'
import { withApiHandler } from '../../../../../utils/api-handler'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const actualRole = event.context.campaignRole as CampaignRole
    const userId = event.context.user?.id || ''
    const db = useDb()

    // Support preview_as for DM/Co-DM only
    const previewAs = getQuery(event).preview_as as string | undefined
    let role = actualRole
    if (previewAs && hasMinRole(actualRole, 'co_dm')) {
      const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
      if (validRoles.includes(previewAs as CampaignRole)) {
        role = previewAs as CampaignRole
      }
    }

    // Entity lookup + visibility enforcement, shared verbatim with the /notes/me routes
    const { entity, character } = await resolveReadableCharacter(
      db,
      campaignId,
      slug,
      userId,
      actualRole,
    )

    // Get stats with group info
    const stats = db
      .select({
        id: characterStats.id,
        value: characterStats.value,
        defId: statDefinitions.id,
        defName: statDefinitions.name,
        defKey: statDefinitions.key,
        defValueType: statDefinitions.valueType,
        defIsSecret: statDefinitions.isSecret,
        groupId: statGroups.id,
        groupName: statGroups.name,
        groupPlayerEditable: statGroups.playerEditable,
      })
      .from(characterStats)
      .innerJoin(statDefinitions, eq(characterStats.statDefinitionId, statDefinitions.id))
      .innerJoin(statGroups, eq(statDefinitions.statGroupId, statGroups.id))
      .where(eq(characterStats.characterId, character.id))
      .all()

    // Get abilities
    let charAbilities = db
      .select()
      .from(abilities)
      .where(eq(abilities.characterId, character.id))
      .orderBy(abilities.sortOrder)
      .all()

    // Strip secrets for non-DM using service functions
    const filteredStats = stripSecretStats(stats, role)
    charAbilities = stripSecretAbilities(charAbilities, role)

    // Read markdown
    let file
    try {
      file = await readEntityFile(entity.filePath)
    } catch {
      file = { frontmatter: {}, content: '', contentHash: '' }
    }

    // Resolve location name if set
    let locationName: string | null = null
    let locationSlug: string | null = null
    if (character.locationEntityId) {
      const locationEntity = db
        .select({ name: entities.name, slug: entities.slug })
        .from(entities)
        .where(eq(entities.id, character.locationEntityId))
        .get()
      locationName = locationEntity?.name ?? null
      locationSlug = locationEntity?.slug ?? null
    }

    // Public notes — every note on the character, attributed to its author.
    // Readable by exactly whoever can read the character: the visibility check above already
    // gated this, so notes narrow automatically if the character's visibility is narrowed.
    // Ordered by updatedAt descending so the page and the tests agree on the order.
    const notes = db
      .select({
        id: characterNotes.id,
        authorUserId: characterNotes.authorUserId,
        authorName: user.name,
        body: characterNotes.body,
        createdAt: characterNotes.createdAt,
        updatedAt: characterNotes.updatedAt,
      })
      .from(characterNotes)
      .innerJoin(user, eq(characterNotes.authorUserId, user.id))
      .where(eq(characterNotes.characterId, character.id))
      .orderBy(desc(characterNotes.updatedAt))
      .all()

    const autoLink = (text: string | null) =>
      text ? autoLinkContent(text, campaignId, entity.id, db) : null

    const description = autoLink(stripSecretBlocks(file.content, role).trim()) ?? ''
    return {
      ...entity,
      ...character,
      locationName,
      locationSlug,
      portraitUrl: character.portraitUrl ?? null,
      frontmatter: file.frontmatter,
      fields: (file.frontmatter as Record<string, unknown>).fields || {},
      content: description,
      description,
      backstory: autoLink(character.backstory ?? null),
      history: autoLink(character.history ?? null),
      currentStatus: autoLink(character.currentStatus ?? null),
      stats: filteredStats,
      abilities: charAbilities,
      notes,
    }
  }),
)
