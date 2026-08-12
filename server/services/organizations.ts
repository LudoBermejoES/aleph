import { eq, and, ne } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { organizations } from '../db/schema/organizations'
import { entities } from '../db/schema/entities'
import { slugify } from './content'

interface OrgCreateData {
  campaignId: string
  name: string
  description?: string | null
  type?: string
  status?: string
  visibility?: string
  templateId?: string | null
  fieldsJson?: string | null
  createdBy: string
}

interface OrgUpdateData {
  name?: string
  description?: string | null
  type?: string
  status?: string
  visibility?: string
  imageUrl?: string | null
  templateId?: string | null
  fieldsJson?: string | null
}

export function createOrganizationWithEntity(db: BetterSQLite3Database, data: OrgCreateData) {
  const {
    campaignId,
    name,
    description,
    type,
    status,
    visibility,
    templateId,
    fieldsJson,
    createdBy,
  } = data
  const now = new Date()
  const orgId = randomUUID()
  const orgSlug = slugify(name)

  const existing = db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, orgSlug)))
    .get()
  if (existing) {
    throw Object.assign(
      new Error('An organization with this name already exists in this campaign'),
      {
        statusCode: 409,
      },
    )
  }

  // Entity slug: use org slug, fall back to <slug>-org if already taken by another entity
  const slugTaken = db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, orgSlug)))
    .get()
  const entitySlug = slugTaken ? `${orgSlug}-org` : orgSlug

  return db.transaction(() => {
    db.insert(entities)
      .values({
        id: orgId,
        campaignId,
        type: 'organization',
        name: name.trim(),
        slug: entitySlug,
        filePath: '',
        visibility: visibility ?? 'members',
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    db.insert(organizations)
      .values({
        id: orgId,
        campaignId,
        entityId: orgId,
        name: name.trim(),
        slug: orgSlug,
        description: description ?? null,
        type: type ?? 'faction',
        status: status ?? 'active',
        templateId: templateId ?? null,
        fieldsJson: fieldsJson ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    return db.select().from(organizations).where(eq(organizations.id, orgId)).get()!
  })
}

export function updateOrganizationWithEntity(
  db: BetterSQLite3Database,
  campaignId: string,
  orgId: string,
  patch: OrgUpdateData,
) {
  const org = db.select().from(organizations).where(eq(organizations.id, orgId)).get()
  if (!org) throw Object.assign(new Error('Organization not found'), { statusCode: 404 })

  const now = new Date()
  let newOrgSlug = org.slug
  let newEntitySlug: string | undefined

  if (patch.name && patch.name.trim() !== org.name) {
    newOrgSlug = slugify(patch.name)

    const collision = db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.campaignId, campaignId),
          eq(organizations.slug, newOrgSlug),
          ne(organizations.id, orgId),
        ),
      )
      .get()
    if (collision) {
      throw Object.assign(
        new Error('An organization with this name already exists in this campaign'),
        { statusCode: 409 },
      )
    }

    // Entity slug: prefer same as org slug, fall back to <slug>-org if taken by something else
    const slugTaken = db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.campaignId, campaignId),
          eq(entities.slug, newOrgSlug),
          ne(entities.id, orgId),
        ),
      )
      .get()
    newEntitySlug = slugTaken ? `${newOrgSlug}-org` : newOrgSlug
  }

  return db.transaction(() => {
    if (org.entityId) {
      db.update(entities)
        .set({
          ...(patch.name ? { name: patch.name.trim() } : {}),
          ...(newEntitySlug ? { slug: newEntitySlug } : {}),
          ...(patch.visibility ? { visibility: patch.visibility } : {}),
          updatedAt: now,
        })
        .where(eq(entities.id, org.entityId))
        .run()
    }

    db.update(organizations)
      .set({
        name: patch.name?.trim() ?? org.name,
        slug: newOrgSlug,
        description: patch.description !== undefined ? patch.description : org.description,
        type: patch.type ?? org.type,
        status: patch.status ?? org.status,
        imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : org.imageUrl,
        templateId: patch.templateId !== undefined ? patch.templateId : org.templateId,
        fieldsJson: patch.fieldsJson !== undefined ? patch.fieldsJson : org.fieldsJson,
        updatedAt: now,
      })
      .where(eq(organizations.id, orgId))
      .run()

    return db.select().from(organizations).where(eq(organizations.id, orgId)).get()!
  })
}

export function deleteOrganizationWithEntity(db: BetterSQLite3Database, orgId: string) {
  const org = db.select().from(organizations).where(eq(organizations.id, orgId)).get()
  if (!org) throw Object.assign(new Error('Organization not found'), { statusCode: 404 })

  return db.transaction(() => {
    db.delete(organizations).where(eq(organizations.id, orgId)).run()

    if (org.entityId) {
      db.delete(entities).where(eq(entities.id, org.entityId)).run()
    }
  })
}
