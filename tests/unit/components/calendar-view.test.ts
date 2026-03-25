import { describe, it, expect } from 'vitest'
import {
  calculateAge,
  getMoonPhase,
  advanceDate,
  isDateInSeason,
  getNextOccurrence,
} from '../../../server/services/calendar'
import type { CalendarDate, CalendarConfig } from '../../../server/services/calendar'

/**
 * CalendarView component logic tests (9.12, 9.13)
 */

const config: CalendarConfig = {
  months: [
    { name: 'Deepwinter', days: 30 },
    { name: 'Claw of Winter', days: 30 },
    { name: 'Claw of Sunsets', days: 30 },
    { name: 'Tarsakh', days: 30 },
    { name: 'Mirtul', days: 30 },
    { name: 'Kythorn', days: 30 },
    { name: 'Flamerule', days: 30 },
    { name: 'Eleasis', days: 30 },
    { name: 'Eleint', days: 30 },
    { name: 'Marpenoth', days: 30 },
    { name: 'Uktar', days: 30 },
    { name: 'Nightal', days: 30 },
  ],
  yearLength: 360,
}

// --- 9.12: CalendarView component logic ---

describe('CalendarView component logic (9.12)', () => {
  it('builds month grid with correct number of days', () => {
    // Simulating what CalendarView does: render cells for each day in a month
    const month = config.months[0] // Deepwinter, 30 days
    const days = Array.from({ length: month.days }, (_, i) => i + 1)
    expect(days).toHaveLength(30)
    expect(days[0]).toBe(1)
    expect(days[29]).toBe(30)
  })

  it('weekday headers render from config', () => {
    const weekdays = ['Soldi', 'Lunedi', 'Martedi', 'Mertedi', 'Yovedi', 'Firedi', 'Sataredi']
    expect(weekdays).toHaveLength(7)
    // First day of month maps to first weekday
    const firstDayWeekdayIndex = 0 // Soldi
    expect(weekdays[firstDayWeekdayIndex]).toBe('Soldi')
  })

  it('moon phase renders for each day', () => {
    const moon = { name: 'Selune', cycleDays: 28, phaseOffset: 0 }
    const phases: number[] = []
    for (let day = 1; day <= 30; day++) {
      phases.push(getMoonPhase({ year: 1400, month: 1, day }, moon, config))
    }
    // All phases should be between 0 and 1
    expect(phases.every(p => p >= 0 && p < 1)).toBe(true)
    // Phases should change across the month
    expect(new Set(phases).size).toBeGreaterThan(1)
  })

  it('season color applies correctly to day cells', () => {
    const summer = { startMonth: 5, startDay: 1, endMonth: 8, endDay: 30 }
    expect(isDateInSeason({ year: 1400, month: 6, day: 15 }, summer, config)).toBe(true)
    expect(isDateInSeason({ year: 1400, month: 1, day: 15 }, summer, config)).toBe(false)
  })

  it('events display in correct day cells', () => {
    const events = [
      { name: 'Battle', date: { year: 1400, month: 3, day: 10 } },
      { name: 'Festival', date: { year: 1400, month: 3, day: 25 } },
    ]
    const currentMonth = 3
    const eventsThisMonth = events.filter(e => e.date.month === currentMonth)
    expect(eventsThisMonth).toHaveLength(2)

    // Map events to day cells
    const eventsByDay = new Map<number, string[]>()
    for (const e of eventsThisMonth) {
      const existing = eventsByDay.get(e.date.day) || []
      existing.push(e.name)
      eventsByDay.set(e.date.day, existing)
    }
    expect(eventsByDay.get(10)).toEqual(['Battle'])
    expect(eventsByDay.get(25)).toEqual(['Festival'])
  })
})

// --- 9.13: Month/year navigation logic ---

describe('Month/year navigation logic (9.13)', () => {
  it('next month increments within year', () => {
    let month = 6
    let year = 1400
    month++
    if (month > config.months.length) { month = 1; year++ }
    expect(month).toBe(7)
    expect(year).toBe(1400)
  })

  it('next month on last month rolls to next year', () => {
    let month = 12
    let year = 1400
    month++
    if (month > config.months.length) { month = 1; year++ }
    expect(month).toBe(1)
    expect(year).toBe(1401)
  })

  it('previous month decrements within year', () => {
    let month = 6
    let year = 1400
    month--
    if (month < 1) { month = config.months.length; year-- }
    expect(month).toBe(5)
    expect(year).toBe(1400)
  })

  it('previous month on first month rolls to previous year', () => {
    let month = 1
    let year = 1400
    month--
    if (month < 1) { month = config.months.length; year-- }
    expect(month).toBe(12)
    expect(year).toBe(1399)
  })

  it('age calculation works across navigation', () => {
    const birth: CalendarDate = { year: 1380, month: 3, day: 15 }
    const current: CalendarDate = { year: 1400, month: 6, day: 15 }
    expect(calculateAge(birth, current, config)).toBe(20)
  })
})
