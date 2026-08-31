/**
 * The `imageOverrideId` prop, run through tldraw's OWN validators.
 *
 * The trap this covers is measured, not stylistic: a shape prop declared
 * `T.string` instead of `T.optional(T.string)` makes tldraw reject every props
 * object that predates the prop — i.e. every diagram saved before this feature —
 * and the diagram simply stops opening. A source-level check that the word
 * `optional` appears is not the same thing as the validator accepting an old
 * shape, so this asserts the behaviour against the real validators exported by
 * the real shape utils.
 */
import { describe, it, expect } from 'vitest'
import { T } from 'tldraw'
import { NPCTokenShapeUtil } from '../../../app/components/diagrams/react/shapes/NPCTokenShape'
import { EntityCardShapeUtil } from '../../../app/components/diagrams/react/shapes/EntityCardShape'
import { LocationPinShapeUtil } from '../../../app/components/diagrams/react/shapes/LocationPinShape'
import { FactionCardShapeUtil } from '../../../app/components/diagrams/react/shapes/FactionCardShape'

/**
 * Each entry is a props object as a snapshot saved BEFORE this change carries it:
 * every prop the shape had then, and no `imageOverrideId` key at all.
 */
const CASES = [
  {
    name: 'npcToken',
    util: NPCTokenShapeUtil,
    legacyProps: {
      w: 140,
      h: 160,
      entityId: 'e1',
      campaignId: 'c1',
      characterName: 'Julia Kirchner',
      portraitUrl: '/img/a.jpg',
      slug: 'julia-kirchner',
      statusBadge: 'alive',
      tags: ['berlin'],
      aspectRatio: 0.875,
    },
  },
  {
    name: 'entityCard',
    util: EntityCardShapeUtil,
    legacyProps: {
      w: 200,
      h: 80,
      entityId: 'e1',
      campaignId: 'c1',
      entityName: 'Der Nachtkurier',
      entityType: 'item',
      portraitUrl: '/img/a.jpg',
      slug: 'der-nachtkurier',
    },
  },
  {
    name: 'locationPin',
    util: LocationPinShapeUtil,
    legacyProps: {
      w: 140,
      h: 175,
      entityId: 'l1',
      campaignId: 'c1',
      locationName: 'Donde apareció Theo',
      locationImageUrl: '/img/a.jpg',
      slug: 'donde-aparecio-theo',
    },
  },
  {
    name: 'factionCard',
    util: FactionCardShapeUtil,
    legacyProps: {
      w: 140,
      h: 160,
      entityId: 'o1',
      campaignId: 'c1',
      factionName: 'Ordo Novus',
      crestUrl: '/img/a.jpg',
      slug: 'ordo-novus',
    },
  },
] as const

function validatorFor(util: { props: unknown }) {
  return T.object(util.props as Record<string, never>)
}

describe.each(CASES)('$name props validator', ({ util, legacyProps }) => {
  it('accepts a props object saved BEFORE imageOverrideId existed', () => {
    expect(() => validatorFor(util).validate({ ...legacyProps })).not.toThrow()
  })

  it('accepts a props object that carries an override', () => {
    expect(() =>
      validatorFor(util).validate({ ...legacyProps, imageOverrideId: 'img-b' }),
    ).not.toThrow()
  })

  it('accepts an explicitly undefined override (the default a fresh shape gets)', () => {
    expect(() =>
      validatorFor(util).validate({ ...legacyProps, imageOverrideId: undefined }),
    ).not.toThrow()
  })

  it('declares the prop in getDefaultProps, so a fresh shape carries the key', () => {
    // Guards against "the type says so but the util never got it": a shape whose
    // defaults lack the key writes snapshots the picker cannot address. The method
    // does not use `this`, so it can be called off the prototype.
    const getDefaultProps = (
      util as unknown as {
        prototype: { getDefaultProps: () => Record<string, unknown> }
      }
    ).prototype.getDefaultProps
    expect('imageOverrideId' in getDefaultProps.call({})).toBe(true)
  })

  // Controls: the validator must really be engaged, or the three assertions
  // above would pass against a validator that checks nothing.
  it('rejects a non-string override', () => {
    expect(() => validatorFor(util).validate({ ...legacyProps, imageOverrideId: 42 })).toThrow()
  })

  it('rejects an unknown prop', () => {
    expect(() => validatorFor(util).validate({ ...legacyProps, notAProp: 'x' })).toThrow()
  })
})
