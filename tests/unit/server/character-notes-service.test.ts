import { describe, it, expect } from 'vitest'
import {
  canAnnotateCharacter,
  canEditCharacter,
  normalizeNoteBody,
} from '../../../server/services/characters'
import { ROLE_HIERARCHY } from '../../../server/utils/permissions'
import type { CampaignRole } from '../../../server/utils/permissions'

const ALL_ROLES = Object.keys(ROLE_HIERARCHY) as CampaignRole[]

describe('canAnnotateCharacter', () => {
  it('covers all five campaign roles — no role is left undecided', () => {
    expect(ALL_ROLES.sort()).toEqual(['co_dm', 'dm', 'editor', 'player', 'visitor'])
  })

  it.each(['dm', 'co_dm', 'editor', 'player'] as CampaignRole[])('allows %s', (role) => {
    expect(canAnnotateCharacter(role)).toBe(true)
  })

  it('refuses visitor — the least-privileged role gets no write path', () => {
    expect(canAnnotateCharacter('visitor')).toBe(false)
  })

  it('refuses an unknown role rather than defaulting to allow', () => {
    expect(canAnnotateCharacter('' as CampaignRole)).toBe(false)
    expect(canAnnotateCharacter('guest' as CampaignRole)).toBe(false)
  })

  it('is strictly wider than canEditCharacter for a non-owner, and never narrower', () => {
    // A player may annotate a character they do not own, but must not be able to edit it.
    // This asserts the two helpers stay independent: annotating must never imply editing.
    expect(canAnnotateCharacter('player')).toBe(true)
    expect(canEditCharacter('player', 'user-1', 'someone-else')).toBe(false)
    // ...and a visitor gets neither.
    expect(canAnnotateCharacter('visitor')).toBe(false)
    expect(canEditCharacter('visitor', 'user-1', 'user-1')).toBe(false)
  })
})

describe('normalizeNoteBody', () => {
  it('returns null for an empty body, so the caller deletes instead of storing a blank', () => {
    expect(normalizeNoteBody('')).toBeNull()
  })

  it.each(['   ', '\n', '\t', ' \n\t \r\n '])('returns null for whitespace-only %j', (body) => {
    expect(normalizeNoteBody(body)).toBeNull()
  })

  it('trims surrounding whitespace but keeps the text', () => {
    expect(normalizeNoteBody('  he lied about the ledger  ')).toBe('he lied about the ledger')
  })

  it('preserves internal newlines and markdown', () => {
    expect(normalizeNoteBody('line one\n\n- **bold**\n')).toBe('line one\n\n- **bold**')
  })

  it('keeps a body that is only punctuation — not whitespace, so not a delete', () => {
    expect(normalizeNoteBody('?')).toBe('?')
  })
})
