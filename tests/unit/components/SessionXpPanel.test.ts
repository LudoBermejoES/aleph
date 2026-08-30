// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import SessionXpPanel from '../../../app/components/sessions/SessionXpPanel.vue'

// Read, don't `import`: Nuxt i18n's vite plugin precompiles an imported locale JSON into message
// ASTs, so `es.sessions.xpNoAwards` would be an object rather than the string on screen.
const es = JSON.parse(
  readFileSync(resolve(__dirname, '../../../i18n/locales/es.json'), 'utf-8'),
) as { sessions: Record<string, string> }

/**
 * Assertions written from the RULE, not from the implementation: the requirement
 * "Choose which characters receive XP in the UI" in
 * `openspec/changes/add-per-character-session-xp/specs/session-participant-management/spec.md`,
 * plus the replace semantics of `PUT .../xp` (design decision 5).
 *
 * This mounts the REAL component with the REAL Spanish locale file, so a missing i18n key or an
 * input that is accepted and never reaches the save payload fails here rather than in a session.
 */

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es } })

function panel(props: Record<string, unknown>) {
  return mount(SessionXpPanel, {
    props: { canManage: true, ...props },
    global: {
      plugins: [i18n],
      // `Button` is the shadcn-vue component the app auto-imports; only its slot matters here.
      stubs: { Button: { template: '<button v-bind="$attrs"><slot /></button>' } },
    },
  })
}

const rows = (w: ReturnType<typeof panel>) => w.findAll('[data-testid="session-xp-row"]')
const inputs = (w: ReturnType<typeof panel>) => w.findAll('[data-testid="session-xp-input"]')
/** The single `PUT` body the panel asks its parent to send. */
const savedAwards = (w: ReturnType<typeof panel>) => w.emitted('save')?.at(-1)?.[0]

const CHARACTERS = [
  { id: 'otto', name: 'Otto' },
  { id: 'julia', name: 'Julia' },
  { id: 'ilse', name: 'Ilse' },
  { id: 'gustav', name: 'Gustav' },
]

describe('SessionXpPanel — what the panel offers', () => {
  it("lists the three characters named by the session's roster", () => {
    const w = panel({
      attendance: [{ characterId: 'otto' }, { characterId: 'julia' }, { characterId: 'ilse' }],
      characters: CHARACTERS,
    })
    expect(rows(w)).toHaveLength(3)
    expect(w.text()).toContain('Otto')
    expect(w.text()).toContain('Julia')
    expect(w.text()).toContain('Ilse')
  })

  it('renders no row for an attendance row that carries no character', () => {
    // Live shape of the 2026-08-24 session: 6 attendance rows, 2 of them with no characterId.
    const w = panel({
      attendance: [
        { characterId: 'otto' },
        { characterId: null },
        { characterId: 'julia' },
        { characterId: undefined },
        { characterId: 'ilse' },
        { characterId: 'gustav' },
      ],
      characters: CHARACTERS,
    })
    expect(rows(w)).toHaveLength(4)
    expect(w.text()).not.toContain('undefined')
    expect(w.text()).not.toContain('null')
  })

  it('names a character it cannot resolve instead of showing a raw id', () => {
    const w = panel({ attendance: [{ characterId: 'deleted-id' }], characters: [] })
    expect(w.text()).toContain(es.sessions.xpUnknownCharacter)
    expect(w.text()).not.toContain('deleted-id')
  })

  it('offers the action in the default state: empty roster, nothing recorded', () => {
    // The state every DM sees first. A panel that only becomes useful once it has data is
    // indistinguishable from a missing feature.
    const w = panel({ attendance: [], xpAwards: [], characters: CHARACTERS })
    expect(rows(w)).toHaveLength(0)
    expect(w.find('[data-testid="session-xp-empty"]').text()).toBe(es.sessions.xpNoAwards)
    expect(w.find('[data-testid="session-xp-add-toggle"]').exists()).toBe(true)
    expect(w.find('[data-testid="session-xp-save"]').exists()).toBe(true)
    expect(w.text()).toContain(es.sessions.xpAwards)
  })

  it('shows what is already recorded without a second request', () => {
    const w = panel({
      attendance: [{ characterId: 'otto' }, { characterId: 'julia' }],
      // Exactly what `GET .../sessions/:slug` returns in `xpAwards`.
      xpAwards: [
        { characterId: 'otto', characterName: 'Otto', characterSlug: 'otto', xp: 2 },
        { characterId: 'julia', characterName: 'Julia', characterSlug: 'julia', xp: 0 },
      ],
      characters: CHARACTERS,
    })
    expect(inputs(w).map((i) => (i.element as HTMLInputElement).value)).toEqual(['2', '0'])
  })

  it('keeps an awarded character that never appeared on the roster', () => {
    const w = panel({
      attendance: [{ characterId: 'otto' }],
      xpAwards: [{ characterId: 'gustav', characterName: 'Gustav', characterSlug: null, xp: 3 }],
      characters: CHARACTERS,
    })
    expect(rows(w)).toHaveLength(2)
    expect(w.text()).toContain('Gustav')
  })
})

describe('SessionXpPanel — what the DM types reaches the PUT', () => {
  it('sends each character the number typed for it', async () => {
    const w = panel({
      attendance: [{ characterId: 'otto' }, { characterId: 'julia' }],
      characters: CHARACTERS,
    })
    await inputs(w)[0]!.setValue('2')
    await inputs(w)[1]!.setValue('3')
    await w.find('[data-testid="session-xp-save"]').trigger('click')
    expect(savedAwards(w)).toEqual([
      { characterId: 'otto', xp: 2 },
      { characterId: 'julia', xp: 3 },
    ])
  })

  it('sends a typed 0 as an award of 0, and omits a character left blank', async () => {
    // 0 means "recorded, earned nothing"; blank means "nothing recorded". Not the same fact.
    const w = panel({
      attendance: [{ characterId: 'otto' }, { characterId: 'julia' }],
      characters: CHARACTERS,
    })
    await inputs(w)[0]!.setValue('0')
    await w.find('[data-testid="session-xp-save"]').trigger('click')
    expect(savedAwards(w)).toEqual([{ characterId: 'otto', xp: 0 }])
  })

  it('awards a character that is not on the roster, added through the picker', async () => {
    const w = panel({ attendance: [{ characterId: 'otto' }], characters: CHARACTERS })
    await w.find('[data-testid="session-xp-add-toggle"]').trigger('click')
    const options = w.findAll('[data-testid="session-xp-picker-option"]')
    // Characters already listed are not offered again.
    expect(options.map((o) => o.text())).toEqual(['Julia', 'Ilse', 'Gustav'])
    await options.find((o) => o.text() === 'Gustav')!.trigger('click')
    expect(rows(w)).toHaveLength(2)
    await inputs(w)[1]!.setValue('4')
    await w.find('[data-testid="session-xp-save"]').trigger('click')
    expect(savedAwards(w)).toContainEqual({ characterId: 'gustav', xp: 4 })
  })

  it('filters the picker by the typed search', async () => {
    const w = panel({ attendance: [], characters: CHARACTERS })
    await w.find('[data-testid="session-xp-add-toggle"]').trigger('click')
    await w.find('[data-testid="session-xp-picker-search"]').setValue('ju')
    expect(w.findAll('[data-testid="session-xp-picker-option"]').map((o) => o.text())).toEqual([
      'Julia',
    ])
  })

  it('drops a removed row from the list, which is how an award is cleared', async () => {
    // The endpoint REPLACES the whole set, so a character absent from the body loses its award.
    const w = panel({
      attendance: [{ characterId: 'otto' }, { characterId: 'julia' }],
      xpAwards: [
        { characterId: 'otto', characterName: 'Otto', characterSlug: 'otto', xp: 2 },
        { characterId: 'julia', characterName: 'Julia', characterSlug: 'julia', xp: 3 },
      ],
      characters: CHARACTERS,
    })
    await w.findAll('[data-testid="session-xp-remove"]')[1]!.trigger('click')
    expect(rows(w)).toHaveLength(1)
    await w.find('[data-testid="session-xp-save"]').trigger('click')
    expect(savedAwards(w)).toEqual([{ characterId: 'otto', xp: 2 }])
    expect(
      (savedAwards(w) as { characterId: string }[]).some((a) => a.characterId === 'julia'),
    ).toBe(false)
  })

  it('saves an empty list when every row has been removed, clearing the session', async () => {
    const w = panel({
      attendance: [{ characterId: 'otto' }],
      xpAwards: [{ characterId: 'otto', characterName: 'Otto', characterSlug: 'otto', xp: 2 }],
      characters: CHARACTERS,
    })
    await w.find('[data-testid="session-xp-remove"]').trigger('click')
    await w.find('[data-testid="session-xp-save"]').trigger('click')
    expect(savedAwards(w)).toEqual([])
  })

  it('refuses to save a value the endpoint would answer 422 to', async () => {
    const w = panel({ attendance: [{ characterId: 'otto' }], characters: CHARACTERS })
    await inputs(w)[0]!.setValue('-1')
    const save = w.find('[data-testid="session-xp-save"]')
    expect(save.attributes('disabled')).toBeDefined()
    await save.trigger('click')
    expect(w.emitted('save')).toBeUndefined()
  })

  it('does not lose what the DM typed when the session is refetched', async () => {
    // Marking someone attended reloads the session; the roster and the awards are unchanged, so
    // the panel must not reset the numbers being entered.
    const w = panel({
      attendance: [{ characterId: 'otto' }],
      xpAwards: [],
      characters: CHARACTERS,
    })
    await inputs(w)[0]!.setValue('2')
    await w.setProps({ attendance: [{ characterId: 'otto' }], xpAwards: [] })
    expect((inputs(w)[0]!.element as HTMLInputElement).value).toBe('2')
  })
})

describe('SessionXpPanel — role gate', () => {
  it('renders no input and no picker below co_dm', () => {
    const w = panel({
      canManage: false,
      attendance: [{ characterId: 'otto' }],
      xpAwards: [{ characterId: 'otto', characterName: 'Otto', characterSlug: 'otto', xp: 2 }],
      characters: CHARACTERS,
    })
    expect(w.find('[data-testid="session-xp-panel"]').exists()).toBe(false)
    expect(inputs(w)).toHaveLength(0)
    expect(w.find('[data-testid="session-xp-add-toggle"]').exists()).toBe(false)
    expect(w.find('[data-testid="session-xp-save"]').exists()).toBe(false)
    expect(w.html()).not.toContain('Otto')
  })
})
