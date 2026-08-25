/**
 * Pure, dependency-free HTML building for a pin's Leaflet marker and popup, shared by
 * MapViewer.client.vue. Kept out of the component (mapPinGeometry.ts's rationale applies
 * here too) so the three marker tiers and the escaping rules are testable without mounting
 * Leaflet.
 *
 * openspec/changes/improve-map-pin-markers-and-deletion/design.md D2: three tiers, in order
 * -- the linked entity's image (circular, cropped to fill), else an icon chosen by the
 * entity's type, else today's plain coloured dot (unchanged). D3's data (`entityImageUrl`/
 * `entityType`) arrives already visibility-filtered by the server; this module only decides
 * how to draw it.
 */

const MARKER_SIZE = 32
const DEFAULT_DOT_COLOR = '#3b82f6'

/** Zoom-scaled marker size, in px. The owner asked for 32 at the coarsest zoom growing to 96
 *  at the most detailed, so a pin is a dot when you are looking at a country and a readable
 *  portrait when you are looking at a street. */
export const MARKER_SIZE_MIN = 32
export const MARKER_SIZE_MAX = 96

/**
 * Linear interpolation from a map's own zoom range onto [MARKER_SIZE_MIN, MARKER_SIZE_MAX].
 *
 * Takes the range as arguments rather than assuming OSM's 0..19, because an `image` map's
 * `maxZoom` is computed from the uploaded image's dimensions (`buildImageMapInitOptions`) and
 * is nothing like 19 -- hardcoding a range would make image maps jump straight to 96.
 *
 * Degenerate ranges (min >= max, or a non-finite zoom) return the minimum rather than
 * dividing by zero: a too-small pin is a cosmetic disappointment, a NaN size is an invisible
 * marker.
 */
export function pinSizeForZoom(zoom: number, minZoom: number, maxZoom: number): number {
  if (!Number.isFinite(zoom) || !Number.isFinite(minZoom) || !Number.isFinite(maxZoom)) {
    return MARKER_SIZE_MIN
  }
  if (maxZoom <= minZoom) return MARKER_SIZE_MIN
  const t = Math.min(1, Math.max(0, (zoom - minZoom) / (maxZoom - minZoom)))
  return Math.round(MARKER_SIZE_MIN + t * (MARKER_SIZE_MAX - MARKER_SIZE_MIN))
}

/**
 * Escapes text for safe interpolation into an HTML string built by hand (Leaflet's
 * `L.divIcon`/`bindPopup` both take raw HTML, not a template the framework escapes for us).
 * `pin.label` already went into `bindPopup` unescaped before this change -- this closes that
 * hole for every field this module touches, without widening it elsewhere.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * The entity types that really exist in the schema (server/services/entity-types.ts's
 * `BUILTIN_TYPES`, seeded into every campaign) -- not invented. A campaign can also define
 * custom types beyond these ten; a custom type falls back to `default`, which still renders
 * a distinct, legible glyph, just not one unique to that custom type (out of scope: that
 * would need joining the per-campaign `entity_types` table for its `icon`, not just the
 * entity's own `type` column).
 */
export const ENTITY_TYPE_MARKER_STYLES: Record<string, { color: string; svgPath: string }> = {
  character: {
    color: '#3b82f6',
    svgPath:
      'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
  },
  location: {
    color: '#10b981',
    svgPath:
      'M12 2C7.6 2 4 5.6 4 10c0 5.4 6.4 11.2 7.3 12a1 1 0 0 0 1.4 0C13.6 21.2 20 15.4 20 10c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
  },
  faction: {
    color: '#f59e0b',
    svgPath:
      'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm0 2.2 6 2.3v4.5c0 3.9-2.6 7.4-6 8.8-3.4-1.4-6-4.9-6-8.8V6.5l6-2.3z',
  },
  item: {
    color: '#8b5cf6',
    svgPath:
      'M12 2 3 6v12l9 4 9-4V6l-9-4zm0 2.2 6.5 2.9L12 10l-6.5-2.9L12 4.2zM5 8.3l6 2.7v8.7l-6-2.7V8.3zm8 11.4v-8.7l6-2.7v8.7l-6 2.7z',
  },
  event: {
    color: '#ef4444',
    svgPath:
      'M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM5 9h14v9H5V9z',
  },
  lore: {
    color: '#06b6d4',
    svgPath:
      'M12 6.5C10.3 5 7.8 4 5 4c-.6 0-1 .4-1 1v13c0 .6.4 1 1 1 2.5 0 4.8.9 6.4 2.3.3.3.9.3 1.2 0C14.2 19.9 16.5 19 19 19c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1-2.8 0-5.3 1-7 2.5zM11 8.4C9.6 7.5 7.8 7 6 6.9v10.1c1.7.1 3.4.6 5 1.5V8.4zm2 10.1c1.6-.9 3.3-1.4 5-1.5V6.9c-1.8.1-3.6.6-5 1.5v10.1z',
  },
  quest: {
    color: '#f97316',
    svgPath: 'M6 2v20h2v-7h9l-2-4 2-4H8V2H6z',
  },
  note: {
    color: '#84cc16',
    svgPath:
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H15a2 2 0 0 1-2-2V3.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h4v2H8V9z',
  },
  session: {
    color: '#ec4899',
    svgPath:
      'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 2v6.4l4.6 2.7 1-1.7-3.6-2.1V6h-2z',
  },
  arc: {
    color: '#6366f1',
    svgPath:
      'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1h13V4H5a1 1 0 0 1-1-1V4a2 2 0 0 1 2-2zm-1 15v3h13v-3H5z',
  },
  default: {
    color: '#6b7280',
    svgPath:
      'M20.6 11.1 12.9 3.4A2 2 0 0 0 11.5 3H5a2 2 0 0 0-2 2v6.5c0 .5.2 1 .6 1.4l7.7 7.7a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8zM7 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  },
}

export interface MarkerPin {
  entityImageUrl?: string | null
  entityType?: string | null
  color?: string | null
}

/**
 * Builds the `L.divIcon` HTML for a pin, per design.md D2's three tiers. `entityImageUrl`
 * and `entityType` come pre-filtered by the server for visibility (D3) -- this function only
 * chooses how to render whatever it is given.
 */
export function buildPinMarkerHtml(pin: MarkerPin, size: number = MARKER_SIZE): string {
  // The border and the glyph scale WITH the circle: a 2px border on a 96px pin reads as a
  // hairline, and an 18px glyph inside it as a speck. Ratios are taken from the original
  // 32px design (2/32 border, 18/32 glyph) so the pin looks the same at every size.
  const border = Math.max(2, Math.round(size / 16))
  const glyph = Math.round((size * 18) / 32)
  // Tier 3 keeps its historic half-size relationship to the entity tiers (the old
  // DOT_SIZE/MARKER_SIZE pair was 16/32); it is a ratio now, not a constant.
  const dot = Math.max(8, Math.round(size / 2))
  if (pin.entityImageUrl) {
    const url = escapeHtml(pin.entityImageUrl)
    // move-pins-and-resolve-entity-images/design.md's Risks: every image URL here is an
    // authenticated API route, and a 401 on a background-image fails SILENTLY -- no console
    // error, no broken-image icon, just an empty circle. `background-color` is set
    // underneath as the type-icon's own colour (or the default grey), so a failed load
    // degrades to a solid, visible circle rather than a hole; a successful load simply
    // paints over it.
    const fallbackColor = (
      (pin.entityType && ENTITY_TYPE_MARKER_STYLES[pin.entityType]) ||
      ENTITY_TYPE_MARKER_STYLES.default
    ).color
    return (
      `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
      `background-color:${fallbackColor};background-image:url(&quot;${url}&quot;);` +
      `background-size:cover;background-position:center;` +
      `border:${border}px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`
    )
  }

  if (pin.entityType) {
    const style = ENTITY_TYPE_MARKER_STYLES[pin.entityType] ?? ENTITY_TYPE_MARKER_STYLES.default
    return (
      `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
      `background:${style.color};border:${border}px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);` +
      `display:flex;align-items:center;justify-content:center;">` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${glyph}" height="${glyph}" fill="white">` +
      `<path d="${style.svgPath}"/></svg></div>`
    )
  }

  // Tier 3, unchanged from before this change: a plain coloured dot for a pin with no entity.
  const color = pin.color || DEFAULT_DOT_COLOR
  return (
    `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${color};` +
    `border:${Math.max(2, Math.round(dot / 8))}px solid white;` +
    `box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`
  )
}

/** Icon size for the divIcon -- must match `buildPinMarkerHtml`'s per-tier square size for
 *  the SAME `size` argument, or Leaflet anchors the marker off-centre. */
export function markerIconSize(pin: MarkerPin, size: number = MARKER_SIZE): [number, number] {
  const px = pin.entityImageUrl || pin.entityType ? size : Math.max(8, Math.round(size / 2))
  return [px, px]
}

/**
 * El nombre que se MUESTRA de un pin: la etiqueta PROPIA del pin si alguien la puso a
 * propósito, y si no el nombre vivo de la entidad enlazada.
 *
 * add-pin-rename/design.md D1: esta prioridad se invirtió a propósito respecto a la que
 * introdujo improve-map-pin-markers-and-deletion (`entityName || label`). Aquella versión
 * resolvía el caso real de una etiqueta que envejecía en silencio al renombrarse el lugar --
 * cinco pines a la vez, medido -- pero solo era segura mientras NINGÚN pin pudiera
 * renombrarse a propósito. En cuanto existe un botón de renombrar (este cambio), esa
 * prioridad haría el renombrado invisible: el nombre vivo de la entidad seguiría ganando
 * siempre, y el usuario vería que su cambio "no hizo nada".
 *
 * Lo que hace segura la vuelta a "la etiqueta manda" es que, desde este cambio, crear un pin
 * YA NO copia el nombre de la entidad en `label` (`onPinDrop`, `pin-add --label` ahora
 * opcional) -- así que un `label` no nulo significa, de aquí en adelante, que alguien lo
 * escribió a propósito. Los pines que quedaron de ANTES de esta regla, cuya `label` era
 * indistinguible de una copia envejecida, se limpian en el backfill de arranque
 * (`server/db/backfills/pin-label-entity-match.ts`, design.md D3) para que no queden
 * "renombrados" para siempre sin que nadie lo pidiera.
 */
export function pinDisplayName(
  pin: { label?: string | null; entityName?: string | null },
  fallback: string,
): string {
  return pin.label || pin.entityName || fallback
}

export interface PopupPin {
  id: string
  entityName?: string | null
  label?: string | null
  entityId?: string | null
  entityType?: string | null
  entitySlug?: string | null
  childMapId?: string | null
  /** The linked entity's image, joined + visibility-filtered server-side -- same source the
   *  marker itself already draws from (`MarkerPin.entityImageUrl`), given its own field here
   *  because the marker- and popup-building interfaces already diverge on purpose (design.md
   *  D6 of add-pin-popup-entity-preview). */
  entityImageUrl?: string | null
  /** Short, plain-text excerpt of the linked entity's description, already
   *  visibility-and-secret-filtered server-side (add-pin-popup-entity-preview/design.md). */
  entityExcerpt?: string | null
}

/**
 * Where "view entity" must go, per entity type. Reported from production: the link pointed at
 * `/campaigns/{id}/entities/{entityId}` and did not load -- that route exists but is keyed by
 * SLUG, so it was being handed the wrong identifier, and the owner wants the type's own page
 * anyway (`/characters/karoline-ober`, `/locations/bosque-de-tegel`,
 * `/organizations/sabbat-incursion`).
 *
 * Every segment here was CHECKED to have a `[slug]` page. `item` is deliberately absent:
 * `app/pages/campaigns/[id]/items/` is keyed `[itemId]`, not `[slug]`, so `/items/{slug}`
 * would 404 -- the same class of broken link this map exists to fix.
 *
 * Only the types with a dedicated page are listed. Anything else -- including a campaign's
 * custom entity types -- falls through to the generic `/entities/{slug}` page, which does
 * exist (`app/pages/campaigns/[id]/entities/[slug]`). A type is never guessed into a route
 * that may 404.
 */
const ENTITY_ROUTE_SEGMENT: Record<string, string> = {
  character: 'characters',
  location: 'locations',
  organization: 'organizations',
  session: 'sessions',
  quest: 'quests',
  arc: 'arcs',
}

/** The path "view entity" links to, or null when there is no slug to address it by. */
export function entityHref(
  campaignId: string | undefined,
  entityType: string | null | undefined,
  entitySlug: string | null | undefined,
): string | null {
  if (!campaignId || !entitySlug) return null
  const segment = (entityType && ENTITY_ROUTE_SEGMENT[entityType]) || 'entities'
  return `/campaigns/${campaignId}/${segment}/${entitySlug}`
}

export interface PopupLabels {
  pinFallback: string
  viewEntity: string
  exploreHint: string
  deletePin: string
}

/** Popup card's width bounds, in px. Bounded on BOTH ends -- narrow enough that an
 *  image-plus-excerpt card never spills off a phone screen, wide enough that the name and the
 *  "Ver entidad" link don't wrap into an unreadable column. Fed to Leaflet's own `bindPopup`
 *  `maxWidth` option too (add-pin-popup-entity-preview/design.md D6) -- Leaflet's popup chrome
 *  is what actually governs on-screen width; this container's own CSS is not enough by itself. */
export const POPUP_MIN_WIDTH = 140
export const POPUP_MAX_WIDTH = 220

/**
 * Builds the popup's HTML. `pin.label` went into this popup unescaped before this change
 * (design.md's Risks) -- every interpolated field here is now escaped, including the two
 * fields add-pin-popup-entity-preview adds (`entityImageUrl`, `entityExcerpt`). The delete
 * button is only included when `canDelete` is true, so a role below editor gets no delete
 * affordance in the DOM at all (spec: "A viewer without permission"); its click handler is
 * attached by the caller on Leaflet's `popupopen` (a `@click` in this HTML string never binds
 * -- design.md's Risks), matched via `data-pin-delete`.
 */
export function buildPinPopupHtml(
  pin: PopupPin,
  campaignId: string | undefined,
  labels: PopupLabels,
  canDelete: boolean,
): string {
  const safeLabel = escapeHtml(pinDisplayName(pin, labels.pinFallback))
  // add-pin-popup-entity-preview/design.md D6: image -> excerpt -> the pre-existing fields, in
  // that order. `object-fit: cover` matches the marker's own cropping rule
  // (improve-map-pin-markers-and-deletion D2) -- a non-square portrait is cropped to fill the
  // frame, never squashed or letterboxed.
  const image = pin.entityImageUrl
    ? `<img src="${escapeHtml(pin.entityImageUrl)}" alt="" style="display:block;width:100%;height:110px;object-fit:cover;border-radius:6px;margin:6px 0;">`
    : ''
  const excerpt = pin.entityExcerpt
    ? `<p style="margin:4px 0;font-size:12px;color:#444;line-height:1.35;">${escapeHtml(pin.entityExcerpt)}</p>`
    : ''
  // No slug means no addressable page, so no link at all -- better than one that 404s, which
  // is what the id-based link did.
  const href = entityHref(campaignId, pin.entityType, pin.entitySlug)
  const entityLink = href
    ? `<br><a href="${escapeHtml(href)}" style="color:#3b82f6;text-decoration:underline;font-size:12px;">${escapeHtml(labels.viewEntity)}</a>`
    : ''
  const exploreHint = pin.childMapId
    ? `<br><span style="font-size:12px;color:#666;">${escapeHtml(labels.exploreHint)}</span>`
    : ''
  const deleteButton = canDelete
    ? `<br><button type="button" data-pin-delete="${escapeHtml(pin.id)}" style="margin-top:6px;font-size:12px;color:#dc2626;background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">${escapeHtml(labels.deletePin)}</button>`
    : ''
  return (
    `<div style="min-width:${POPUP_MIN_WIDTH}px;max-width:${POPUP_MAX_WIDTH}px;">` +
    `<strong>${safeLabel}</strong>${image}${excerpt}${entityLink}${exploreHint}${deleteButton}</div>`
  )
}
