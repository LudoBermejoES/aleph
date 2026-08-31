/**
 * Diagram entity palette — which groups the palette offers, and in what order.
 *
 * The palette used to hold its own list of five group names, and its generic group was queried as
 * `entities.type IN ('entity', 'wiki')` — two values no campaign in this app has ever used. So the
 * group list is DERIVED instead of written down.
 *
 * It is derived from TWO sources, and needing both is a measured fact, not defensiveness. On
 * `berlin-en-tinieblas` the two disagree in both directions at once:
 *
 *   - declared in `entity_types` but unused: `faction`, `event`, `note`
 *   - used by real entities but never declared: `organization`, `arc`
 *
 * Deriving from `entity_types` alone would have left the campaign's 13 `arc` entities exactly as
 * invisible as the objects this change exists to surface — the same defect with a different
 * literal. Deriving from the entities alone would lose the DM's own labels and ordering. So:
 * declared types give label and order; types merely present are appended so nothing is
 * unreachable.
 *
 * See openspec/changes/add-all-entity-types-to-diagram-palette/design.md D1–D3.
 */

/** Group keys the endpoint serves from a dedicated query, in the order the palette shows them. */
export const BUILTIN_GROUP_KEYS = ['characters', 'locations', 'organizations', 'quests'] as const

/**
 * Entity-type slugs the fan-out must NOT emit, because a built-in group already serves them.
 *
 * `faction` AND `organization` are both here on purpose and it is not redundancy: the
 * `entity_types` slug is `faction`, while the `entities.type` those rows carry is `organization`.
 * Excluding only one spelling lists every organization twice (design D2) — and the campaign this
 * was built against declares the first and stores the second, so both spellings are live.
 */
export const FANOUT_EXCLUDED_SLUGS = new Set([
  'character',
  'location',
  'quest',
  'faction',
  'organization',
])

/**
 * Keys the response uses for something other than a group's entity array. A campaign type with one
 * of these slugs would overwrite it, so it is skipped rather than allowed to corrupt the payload.
 */
const RESERVED_RESPONSE_KEYS = new Set([...BUILTIN_GROUP_KEYS, 'wiki', 'groups'])

/** A row of the campaign's own `entity_types` table, as far as the palette cares. */
export interface CampaignEntityType {
  slug: string
  name: string
  sortOrder: number
}

/** One group the client should render. */
export interface PaletteGroup {
  key: string
  /**
   * For a built-in group this is the i18n key's own suffix — the client translates
   * `diagrams.panel.<key>`. For a campaign type it is `entity_types.name`, shown VERBATIM: it is
   * user data, and running it through `t()` would print a raw key at the reader.
   */
  label: string
  builtin: boolean
}

/**
 * Build the ordered group list: the four built-ins, then the campaign's declared types in the
 * campaign's own `sortOrder`, then any type that real entities use but nobody declared.
 *
 * Duplicate slugs collapse (first wins), because `entity_types` has no unique index on
 * `(campaign_id, slug)` — verified against migration `0000_lethal_mephistopheles.sql` — and a
 * duplicated row would otherwise produce two groups reading the same entities.
 *
 * @param declared rows of this campaign's `entity_types`
 * @param present  distinct `entities.type` values actually stored for this campaign
 */
export function buildPaletteGroups(
  declared: CampaignEntityType[],
  present: string[] = [],
): PaletteGroup[] {
  const groups: PaletteGroup[] = BUILTIN_GROUP_KEYS.map((key) => ({
    key,
    label: key,
    builtin: true,
  }))

  const seen = new Set<string>(RESERVED_RESPONSE_KEYS)

  const push = (slug: string, label: string) => {
    if (!slug) return
    if (FANOUT_EXCLUDED_SLUGS.has(slug)) return
    if (seen.has(slug)) return
    seen.add(slug)
    groups.push({ key: slug, label, builtin: false })
  }

  for (const type of [...declared].sort((a, b) => a.sortOrder - b.sortOrder)) {
    push(type.slug, type.name)
  }

  // Undeclared but in use. No DM-given name exists, so the slug itself is the label.
  for (const slug of present) push(slug, slug)

  return groups
}

/** The entity-type slugs the fan-out should query, in group order. */
export function fanoutTypeSlugs(declared: CampaignEntityType[], present: string[] = []): string[] {
  return buildPaletteGroups(declared, present)
    .filter((g) => !g.builtin)
    .map((g) => g.key)
}
