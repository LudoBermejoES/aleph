/**
 * Server-safe shape schema definitions for custom tldraw shapes.
 * No JSX / React imports — only prop validators from @tldraw/tlschema.
 * Used by tldraw-rooms.ts to build a TLSchema that accepts custom shapes.
 */
import { T } from '@tldraw/validate'
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from '@tldraw/tlschema'

const customShapeSchemas = {
  npcToken: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      characterName: T.string,
      portraitUrl: T.optional(T.string),
      slug: T.string,
      statusBadge: T.optional(T.string),
      tags: T.optional(T.arrayOf(T.string)),
    },
  },
  locationPin: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      locationName: T.string,
      slug: T.string,
      locationImageUrl: T.optional(T.string),
    },
  },
  questNode: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      questTitle: T.string,
      status: T.string,
      slug: T.string,
    },
  },
  factionCard: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      slug: T.string,
      factionName: T.string,
      crestUrl: T.optional(T.string),
      alignment: T.optional(T.string),
      memberCount: T.optional(T.number),
    },
  },
  entityCard: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      entityName: T.string,
      entityType: T.string,
      portraitUrl: T.optional(T.string),
      slug: T.string,
    },
  },
  regionBox: {
    props: {
      w: T.number,
      h: T.number,
      label: T.string,
      color: T.optional(T.string),
    },
  },
  anchorToken: {
    props: {
      w: T.number,
      h: T.number,
      label: T.string,
      targetType: T.string,
      targetDiagramId: T.optional(T.string),
      targetUrl: T.optional(T.string),
      color: T.optional(T.string),
    },
  },
  mapToken: {
    props: {
      w: T.number,
      h: T.number,
      mapId: T.string,
      campaignId: T.string,
      label: T.string,
      imageUrl: T.optional(T.string),
    },
  },
  stickyNote: {
    props: {
      w: T.number,
      h: T.number,
      text: T.string,
      color: T.optional(T.string),
    },
  },
  canvasLabel: {
    props: {
      w: T.number,
      h: T.number,
      text: T.string,
      fontSize: T.optional(T.number),
      color: T.optional(T.string),
    },
  },
  genealogyNode: {
    props: {
      w: T.number,
      h: T.number,
      entityId: T.string,
      campaignId: T.string,
      characterName: T.string,
      slug: T.string,
      portraitUrl: T.optional(T.string),
      birthYear: T.optional(T.number),
      deathYear: T.optional(T.number),
      gender: T.optional(T.string),
    },
  },
}

export const alephTLSchema = createTLSchema({
  shapes: { ...defaultShapeSchemas, ...customShapeSchemas },
  bindings: defaultBindingSchemas,
})
