// --- Types ---

export interface CalendarDate {
  year: number
  month: number // 1-based
  day: number   // 1-based
}

export interface CalendarConfig {
  months: Array<{ name: string; days: number }>
  yearLength: number // total days in a year
}

interface MoonConfig {
  name: string
  cycleDays: number
  phaseOffset: number
}

interface SeasonRange {
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
}

interface RecurringEvent {
  month: number // 1-based for yearly, 0 for monthly (use day only)
  day: number
  recurrence: 'yearly' | 'monthly'
}

// --- Age Calculation ---

/**
 * Calculate age in custom calendar years.
 */
export function calculateAge(birth: CalendarDate, current: CalendarDate, config: CalendarConfig): number {
  let age = current.year - birth.year

  // Check if birthday hasn't occurred yet this year
  if (current.month < birth.month || (current.month === birth.month && current.day < birth.day)) {
    age--
  }

  return Math.max(0, age)
}

// --- Moon Phase ---

/**
 * Get moon phase as a normalized value 0-1 (0 = new moon, 0.5 = full moon).
 */
export function getMoonPhase(date: CalendarDate, moon: MoonConfig, config: CalendarConfig): number {
  const totalDays = dateToDayOfYear(date, config) + (date.year * config.yearLength)
  const adjustedDay = totalDays + moon.phaseOffset
  return (adjustedDay % moon.cycleDays) / moon.cycleDays
}

// --- Recurring Events ---

/**
 * Get the next occurrence of a recurring event after a given date.
 */
export function getNextOccurrence(event: RecurringEvent, after: CalendarDate, config: CalendarConfig): CalendarDate {
  if (event.recurrence === 'yearly') {
    // Check if it occurs later this year
    if (event.month > after.month || (event.month === after.month && event.day > after.day)) {
      return { year: after.year, month: event.month, day: event.day }
    }
    return { year: after.year + 1, month: event.month, day: event.day }
  }

  if (event.recurrence === 'monthly') {
    // Next month with the specified day
    if (event.day > after.day) {
      return { year: after.year, month: after.month, day: event.day }
    }
    let nextMonth = after.month + 1
    let nextYear = after.year
    if (nextMonth > config.months.length) {
      nextMonth = 1
      nextYear++
    }
    return { year: nextYear, month: nextMonth, day: event.day }
  }

  return after
}

// --- Season Check ---

/**
 * Check if a date falls within a season range.
 * Handles seasons that wrap around the year boundary.
 */
export function isDateInSeason(date: CalendarDate, season: SeasonRange, config: CalendarConfig): boolean {
  const dateVal = date.month * 100 + date.day
  const startVal = season.startMonth * 100 + season.startDay
  const endVal = season.endMonth * 100 + season.endDay

  if (startVal <= endVal) {
    // Normal range (e.g., spring: month 3 to month 5)
    return dateVal >= startVal && dateVal <= endVal
  } else {
    // Wrapping range (e.g., winter: month 11 to month 2)
    return dateVal >= startVal || dateVal <= endVal
  }
}

// --- Date Advancement ---

/**
 * Advance a date by N days, handling month/year rollover.
 */
export function advanceDate(date: CalendarDate, days: number, config: CalendarConfig): CalendarDate {
  let { year, month, day } = date
  let remaining = days

  while (remaining > 0) {
    const monthIndex = month - 1
    const daysInMonth = config.months[monthIndex]?.days ?? 30
    const daysLeftInMonth = daysInMonth - day

    if (remaining <= daysLeftInMonth) {
      day += remaining
      remaining = 0
    } else {
      remaining -= (daysLeftInMonth + 1)
      month++
      day = 1
      if (month > config.months.length) {
        month = 1
        year++
      }
    }
  }

  return { year, month, day }
}

// --- Helpers ---

function dateToDayOfYear(date: CalendarDate, config: CalendarConfig): number {
  let days = 0
  for (let i = 0; i < date.month - 1; i++) {
    days += config.months[i]?.days ?? 30
  }
  days += date.day
  return days
}
