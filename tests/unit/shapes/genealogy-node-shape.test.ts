import { describe, it, expect } from 'vitest'
import {
  formatYearLabel,
  genderToColor,
} from '../../../app/components/diagrams/react/shapes/GenealogyNodeShape'

describe('formatYearLabel', () => {
  it('returns empty string when both years are null/undefined', () => {
    expect(formatYearLabel(null, null)).toBe('')
    expect(formatYearLabel(undefined, undefined)).toBe('')
  })

  it('formats birth year only', () => {
    expect(formatYearLabel(1200, null)).toBe('(1200)')
    expect(formatYearLabel(1200, undefined)).toBe('(1200)')
  })

  it('formats both birth and death years', () => {
    expect(formatYearLabel(1200, 1265)).toBe('(1200–1265)')
  })

  it('formats death year only with unknown birth', () => {
    expect(formatYearLabel(null, 1265)).toBe('(?–1265)')
    expect(formatYearLabel(undefined, 1265)).toBe('(?–1265)')
  })

  it('handles year 0', () => {
    expect(formatYearLabel(0, null)).toBe('(0)')
  })

  it('handles negative years (BC)', () => {
    expect(formatYearLabel(-50, 10)).toBe('(-50–10)')
  })
})

describe('genderToColor', () => {
  it('returns gray for null/undefined/empty', () => {
    expect(genderToColor(null)).toBe('#9ca3af')
    expect(genderToColor(undefined)).toBe('#9ca3af')
    expect(genderToColor('')).toBe('#9ca3af')
  })

  it('returns blue for male variants', () => {
    expect(genderToColor('male')).toBe('#3b82f6')
    expect(genderToColor('Male')).toBe('#3b82f6')
    expect(genderToColor('man')).toBe('#3b82f6')
    expect(genderToColor('masculine')).toBe('#3b82f6')
  })

  it('returns pink for female variants', () => {
    expect(genderToColor('female')).toBe('#ec4899')
    expect(genderToColor('Female')).toBe('#ec4899')
    expect(genderToColor('woman')).toBe('#ec4899')
    expect(genderToColor('feminine')).toBe('#ec4899')
  })

  it('returns gray for unknown/non-binary/other values', () => {
    expect(genderToColor('non-binary')).toBe('#9ca3af')
    expect(genderToColor('unknown')).toBe('#9ca3af')
    expect(genderToColor('other')).toBe('#9ca3af')
  })
})
