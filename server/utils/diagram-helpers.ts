import { randomUUID } from 'crypto'
import type { GeneratedShape } from './diagram-generator'

/**
 * Radial layout: distribute `count` positions evenly in a circle.
 * Pure math, no DB or tldraw dependency — safe to use server-side or client-side.
 */
export function radialLayout(
  centerX: number,
  centerY: number,
  count: number,
  radius: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    }
  })
}

/**
 * Build an npcToken shape descriptor for a character entity.
 */
export function buildNpcTokenShape(
  entity: { id: string; name: string; slug: string; portraitUrl?: string | null },
  campaignId: string,
  x: number,
  y: number,
): GeneratedShape {
  return {
    id: randomUUID(),
    type: 'npcToken',
    x,
    y,
    props: {
      w: 140,
      h: 160,
      entityId: entity.id,
      campaignId,
      slug: entity.slug,
      characterName: entity.name,
      portraitUrl: entity.portraitUrl ?? undefined,
    },
  }
}

/**
 * Build a locationPin shape descriptor for a location entity.
 */
export function buildLocationPinShape(
  entity: { id: string; name: string; slug: string },
  campaignId: string,
  x: number,
  y: number,
): GeneratedShape {
  return {
    id: randomUUID(),
    type: 'locationPin',
    x,
    y,
    props: {
      w: 180,
      h: 60,
      entityId: entity.id,
      campaignId,
      slug: entity.slug,
      locationName: entity.name,
    },
  }
}

/**
 * Build a factionCard shape descriptor for an organization.
 */
export function buildFactionCardShape(
  org: { id: string; name: string; slug: string },
  campaignId: string,
  x: number,
  y: number,
): GeneratedShape {
  return {
    id: randomUUID(),
    type: 'factionCard',
    x,
    y,
    props: {
      w: 180,
      h: 100,
      entityId: org.id,
      campaignId,
      slug: org.slug,
      factionName: org.name,
    },
  }
}
