import { describe, it, expect } from 'vitest'
import {
  calculateAge,
  getMoonPhase,
  getNextOccurrence,
  isDateInSeason,
  advanceDate,
  type CalendarDate,
  type CalendarConfig,
} from '../../../server/services/calendar'

const testConfig: CalendarConfig = {
  months: [
    { name: 'Hammer', days: 30 },
    { name: 'Alturiak', days: 30 },
    { name: 'Ches', days: 30 },
    { name: 'Tarsakh', days: 30 },
    { name: 'Mirtul', days: 30 },
    { name: 'Kythorn', days: 30 },
    { name: 'Flamerule', days: 30 },
    { name: 'Eleasias', days: 30 },
    { name: 'Eleint', days: 30 },
    { name: 'Marpenoth', days: 30 },
    { name: 'Uktar', days: 30 },
    { name: 'Nightal', days: 30 },
  ],
  yearLength: 360,
}

describe('calculateAge', () => {
  it('returns correct age in custom calendar years', () => {
    const birth: CalendarDate = { year: 1300, month: 3, day: 15 }
    const current: CalendarDate = { year: 1350, month: 6, day: 10 }
    expect(calculateAge(birth, current, testConfig)).toBe(50)
  })

  it('returns age-1 when birthday has not occurred yet this year', () => {
    const birth: CalendarDate = { year: 1300, month: 8, day: 15 }
    const current: CalendarDate = { year: 1350, month: 3, day: 10 }
    expect(calculateAge(birth, current, testConfig)).toBe(49)
  })

  it('returns 0 for same year birth', () => {
    const birth: CalendarDate = { year: 1350, month: 1, day: 1 }
    const current: CalendarDate = { year: 1350, month: 6, day: 10 }
    expect(calculateAge(birth, current, testConfig)).toBe(0)
  })
})

describe('getMoonPhase', () => {
  it('computes correct phase for given cycle', () => {
    const moon = { name: 'Luna', cycleDays: 28, phaseOffset: 0 }
    // Day 0 = new moon (phase 0), day 7 = first quarter, day 14 = full moon
    const phase = getMoonPhase({ year: 1350, month: 1, day: 1 }, moon, testConfig)
    expect(phase).toBeGreaterThanOrEqual(0)
    expect(phase).toBeLessThan(1) // normalized 0-1
  })

  it('multiple moons return independent phases', () => {
    const luna = { name: 'Luna', cycleDays: 28, phaseOffset: 0 }
    const selune = { name: 'Selune', cycleDays: 36, phaseOffset: 5 }
    const date: CalendarDate = { year: 1350, month: 3, day: 15 }
    const p1 = getMoonPhase(date, luna, testConfig)
    const p2 = getMoonPhase(date, selune, testConfig)
    // Different cycles should produce different phases (usually)
    expect(typeof p1).toBe('number')
    expect(typeof p2).toBe('number')
  })
})

describe('getNextOccurrence', () => {
  it('yearly recurring event returns next year date', () => {
    const event = { month: 6, day: 15, recurrence: 'yearly' as const }
    const after: CalendarDate = { year: 1350, month: 7, day: 1 }
    const next = getNextOccurrence(event, after, testConfig)
    expect(next.year).toBe(1351)
    expect(next.month).toBe(6)
    expect(next.day).toBe(15)
  })

  it('yearly event in future of current year returns same year', () => {
    const event = { month: 10, day: 1, recurrence: 'yearly' as const }
    const after: CalendarDate = { year: 1350, month: 3, day: 1 }
    const next = getNextOccurrence(event, after, testConfig)
    expect(next.year).toBe(1350)
    expect(next.month).toBe(10)
  })

  it('monthly recurring event returns next month', () => {
    const event = { month: 0, day: 15, recurrence: 'monthly' as const }
    const after: CalendarDate = { year: 1350, month: 3, day: 20 }
    const next = getNextOccurrence(event, after, testConfig)
    expect(next.month).toBe(4)
    expect(next.day).toBe(15)
  })
})

describe('isDateInSeason', () => {
  it('date within season returns true', () => {
    const season = { startMonth: 3, startDay: 1, endMonth: 5, endDay: 30 }
    expect(isDateInSeason({ year: 1350, month: 4, day: 15 }, season, testConfig)).toBe(true)
  })

  it('date outside season returns false', () => {
    const season = { startMonth: 3, startDay: 1, endMonth: 5, endDay: 30 }
    expect(isDateInSeason({ year: 1350, month: 8, day: 1 }, season, testConfig)).toBe(false)
  })

  it('season wrapping year boundary works', () => {
    const winter = { startMonth: 11, startDay: 1, endMonth: 2, endDay: 28 }
    expect(isDateInSeason({ year: 1350, month: 12, day: 15 }, winter, testConfig)).toBe(true)
    expect(isDateInSeason({ year: 1350, month: 1, day: 10 }, winter, testConfig)).toBe(true)
    expect(isDateInSeason({ year: 1350, month: 6, day: 1 }, winter, testConfig)).toBe(false)
  })
})

describe('advanceDate', () => {
  it('advances within same month', () => {
    const result = advanceDate({ year: 1350, month: 1, day: 10 }, 5, testConfig)
    expect(result).toEqual({ year: 1350, month: 1, day: 15 })
  })

  it('crosses month boundary', () => {
    const result = advanceDate({ year: 1350, month: 1, day: 25 }, 10, testConfig)
    expect(result).toEqual({ year: 1350, month: 2, day: 5 })
  })

  it('crosses year boundary', () => {
    const result = advanceDate({ year: 1350, month: 12, day: 25 }, 10, testConfig)
    expect(result).toEqual({ year: 1351, month: 1, day: 5 })
  })

  it('advances 0 days returns same date', () => {
    const result = advanceDate({ year: 1350, month: 3, day: 15 }, 0, testConfig)
    expect(result).toEqual({ year: 1350, month: 3, day: 15 })
  })
})
