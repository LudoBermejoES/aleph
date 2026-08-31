/// <reference types="node" />
/**
 * Integration coverage for the diagram entity palette.
 *
 * The defect: the palette's generic group was queried as `entities.type IN ('entity','wiki')`, two
 * values no campaign in this app uses, so the group was always empty and a third of a real
 * campaign's entities (objects, lore, arcs, sessions, notes) could not be placed on a diagram.
 *
 * The suite that existed could not catch it. Its only assertion about this endpoint was
 * `expect(data).toHaveProperty('wiki')`, which an always-empty array satisfies. So every test here
 * asserts a **row**, never the presence of a key — and each is mutation-checked by restoring the
 * old clause and requiring red.
 *
 * A second, unrelated hole is covered here too, found while writing the change: this endpoint never
 * filtered `visibility` at all, while its `batch` sibling always did. The palette therefore leaked
 * the names of every DM-only entity to any player who opened a diagram.
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

interface ApiOpts extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function apiRaw(url: string, opts?: ApiOpts) {
  const { body, ...rest } = opts ?? {}
  return fetch(`${BASE_URL}${url}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...rest?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function api(url: string, opts?: ApiOpts) {
  const res = await apiRaw(url, opts)
  if (!res.ok) throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${await res.text()}`)
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const csrfMatch = (getRes.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfToken = cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

const key = (apiKey: string) => ({ 'X-API-Key': apiKey })

interface PaletteGroup {
  key: string
  label: string
  builtin: boolean
}
type Palette = Record<string, unknown> & { groups: PaletteGroup[] }
interface Row {
  id: string
  name: string
  slug: string
  type: string
}

/** Every entity row in the payload, flattened, with the group it came from. */
function allRows(p: Palette): { group: string; row: Row }[] {
  const out: { group: string; row: Row }[] = []
  for (const [group, value] of Object.entries(p)) {
    if (group === 'groups' || !Array.isArray(value)) continue
    for (const row of value as Row[]) out.push({ group, row })
  }
  return out
}

describe('Diagram entity palette (integration)', () => {
  const ts = Date.now()
  let dmApiKey = ''
  let playerApiKey = ''
  let campaignId = ''
  let itemId = ''
  let dmOnlyItemId = ''

  beforeAll(async () => {
    const dmCookie = await signUpAndGetCookie(`palette-dm-${ts}@example.com`)
    dmApiKey = (await createApiKey(dmCookie, 'palette-dm-key')).key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: key(dmApiKey),
      body: { name: `Palette Camp ${ts}` },
    })
    campaignId = camp.id

    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: key(dmApiKey),
      body: { role: 'player' },
    })
    const playerCookie = await signUpAndGetCookie(`palette-player-${ts}@example.com`)
    playerApiKey = (await createApiKey(playerCookie, 'palette-player-key')).key
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: key(playerApiKey),
      body: { token: invite.token },
    })

    // The entities under test. `item` and `lore` are types the seeded campaign declares; `arc` is
    // deliberately one it does NOT declare, because a real campaign was measured storing 13 of
    // them with no `entity_types` row — the palette must reach those too.
    const item = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: key(dmApiKey),
      body: { name: 'El traje de oro', type: 'item', content: 'Kilo y medio de oro.' },
    })
    itemId = item.id

    const dmOnly = await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: key(dmApiKey),
      body: { name: 'El secreto del sastre', type: 'item', visibility: 'dm_only' },
    })
    dmOnlyItemId = dmOnly.id

    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: key(dmApiKey),
      body: { name: 'El sendero de plata', type: 'lore' },
    })
    await api(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: key(dmApiKey),
      body: { name: 'Bajo el sol negro', type: 'arc' },
    })
  })

  async function palette(apiKey: string, q?: string): Promise<Palette> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : ''
    return api(`/api/campaigns/${campaignId}/diagrams/entities${qs}`, { headers: key(apiKey) })
  }

  // ─── The defect ───────────────────────────────────────────────────────────

  it('returns an object in an item group — a ROW, not merely the key', async () => {
    const p = await palette(dmApiKey)
    const items = p.item as Row[] | undefined
    expect(items, 'the response has no `item` group at all').toBeDefined()
    expect(items!.map((r) => r.name)).toContain('El traje de oro')
  })

  it('returns lore, and an ARC whose type no entity_types row declares', async () => {
    const p = await palette(dmApiKey)
    expect((p.lore as Row[]).map((r) => r.name)).toContain('El sendero de plata')
    expect((p.arc as Row[] | undefined) ?? [], 'undeclared type unreachable').toHaveLength(1)
    expect((p.arc as Row[])[0]!.name).toBe('Bajo el sol negro')
  })

  it('names the item group in `groups`, with the campaign own label, not translated', async () => {
    const p = await palette(dmApiKey)
    const g = p.groups.find((x) => x.key === 'item')
    expect(g).toBeDefined()
    expect(g!.builtin).toBe(false)
    // Whatever the seeded label is, it must not be an i18n key.
    expect(g!.label).not.toMatch(/^diagrams\./)
    expect(g!.label.length).toBeGreaterThan(0)
  })

  it('puts the four built-in groups first and marks them translatable', async () => {
    const p = await palette(dmApiKey)
    expect(p.groups.slice(0, 4).map((g) => g.key)).toEqual([
      'characters',
      'locations',
      'organizations',
      'quests',
    ])
    expect(p.groups.slice(0, 4).every((g) => g.builtin)).toBe(true)
  })

  it('keeps the five legacy keys, so an older reader does not break', async () => {
    const p = await palette(dmApiKey)
    for (const k of ['characters', 'locations', 'organizations', 'quests', 'wiki']) {
      expect(Array.isArray(p[k]), `${k} missing or not an array`).toBe(true)
    }
  })

  // ─── No entity in two groups ──────────────────────────────────────────────

  it('never returns the same entity in two groups', async () => {
    const rows = allRows(await palette(dmApiKey))
    const seen = new Map<string, string>()
    for (const { group, row } of rows) {
      const prev = seen.get(row.id)
      expect(prev, `${row.name} appears in both ${prev} and ${group}`).toBeUndefined()
      seen.set(row.id, group)
    }
  })

  it('offers no faction or organization group beside `organizations`', async () => {
    const p = await palette(dmApiKey)
    const extras = p.groups.filter((g) => !g.builtin).map((g) => g.key)
    expect(extras).not.toContain('faction')
    expect(extras).not.toContain('organization')
  })

  it('offers no group key that would clobber `groups` itself', async () => {
    const p = await palette(dmApiKey)
    expect(p.groups.map((g) => g.key)).not.toContain('groups')
    expect(Array.isArray(p.groups)).toBe(true)
  })

  // ─── Visibility ───────────────────────────────────────────────────────────

  it('a player does not receive a dm_only object through the palette', async () => {
    const ids = allRows(await palette(playerApiKey)).map((x) => x.row.id)
    expect(ids).not.toContain(dmOnlyItemId)
    // Control: the player DOES get the visible one, so an empty response cannot pass this.
    expect(ids).toContain(itemId)
  })

  it('a DM does receive the dm_only object', async () => {
    const ids = allRows(await palette(dmApiKey)).map((x) => x.row.id)
    expect(ids).toContain(dmOnlyItemId)
  })

  it('403 for a caller with no membership', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/entities`)
    expect([401, 403]).toContain(res.status)
  })

  // ─── Search still works on the new groups ─────────────────────────────────

  it('the search query filters the new groups too', async () => {
    const p = await palette(dmApiKey, 'traje')
    expect((p.item as Row[]).map((r) => r.name)).toEqual(['El traje de oro'])
    expect((p.lore as Row[]) ?? []).toHaveLength(0)
  })

  it('an unmatched query returns no rows anywhere', async () => {
    const rows = allRows(await palette(dmApiKey, 'xyzxyzxyz999'))
    expect(rows).toHaveLength(0)
  })

  // ─── Hydration was already type-agnostic (design D5) ──────────────────────

  it('batch rehydrates an object by id, so a placed card is not blank after a reload', async () => {
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${itemId}`,
      { headers: key(dmApiKey) },
    )
    expect(data[itemId]).toBeDefined()
    expect(data[itemId].name).toBe('El traje de oro')
    expect(data[itemId].type).toBe('item')
  })

  it('batch does not hand a player a dm_only object', async () => {
    const data = await api(
      `/api/campaigns/${campaignId}/diagrams/entities/batch?ids=${dmOnlyItemId},${itemId}`,
      { headers: key(playerApiKey) },
    )
    expect(data[dmOnlyItemId]).toBeUndefined()
    expect(data[itemId]).toBeDefined()
  })
})
