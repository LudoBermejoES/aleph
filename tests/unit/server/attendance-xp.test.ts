import { describe, it, expect } from 'vitest'
import { attendanceXpSchema, canSetAttendanceXp } from '../../../server/utils/attendance-xp'

describe('attendanceXpSchema', () => {
  it('accepts a positive integer', () => {
    expect(attendanceXpSchema.safeParse({ xp: 2 }).success).toBe(true)
  })

  it('accepts zero — distinct from "not recorded", but a legal value', () => {
    expect(attendanceXpSchema.safeParse({ xp: 0 }).success).toBe(true)
  })

  it('accepts null — clears a previously recorded value', () => {
    expect(attendanceXpSchema.safeParse({ xp: null }).success).toBe(true)
  })

  it('rejects a negative value', () => {
    expect(attendanceXpSchema.safeParse({ xp: -1 }).success).toBe(false)
  })

  it('rejects a fractional value', () => {
    expect(attendanceXpSchema.safeParse({ xp: 1.5 }).success).toBe(false)
  })

  it('rejects a missing xp key — the caller must say "set" or "clear", never a silent no-op', () => {
    expect(attendanceXpSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a non-numeric xp', () => {
    expect(attendanceXpSchema.safeParse({ xp: '2' }).success).toBe(false)
  })
})

describe('canSetAttendanceXp', () => {
  // Table-driven over the decision matrix from design.md decision 1: a non-null xp requires
  // attended === true; null (clearing) is always fine regardless of attendance.
  const cases: Array<{
    attended: boolean | null | undefined
    xp: number | null
    expected: boolean
    label: string
  }> = [
    { attended: true, xp: 2, expected: true, label: 'attended + positive xp -> allowed' },
    { attended: true, xp: 0, expected: true, label: 'attended + zero xp -> allowed (real zero)' },
    { attended: false, xp: 2, expected: false, label: 'not attended + positive xp -> refused' },
    { attended: false, xp: 0, expected: false, label: 'not attended + zero xp -> still refused' },
    { attended: null, xp: 1, expected: false, label: 'attended never recorded + xp -> refused' },
    { attended: undefined, xp: 1, expected: false, label: 'attended undefined + xp -> refused' },
    { attended: false, xp: null, expected: true, label: 'not attended + clear -> always allowed' },
    { attended: true, xp: null, expected: true, label: 'attended + clear -> always allowed' },
    {
      attended: null,
      xp: null,
      expected: true,
      label: 'attended unknown + clear -> always allowed',
    },
  ]

  for (const { attended, xp, expected, label } of cases) {
    it(label, () => {
      expect(canSetAttendanceXp(attended, xp)).toBe(expected)
    })
  }
})
