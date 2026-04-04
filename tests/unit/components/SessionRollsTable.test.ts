import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../app/components/sessions/SessionRollsTable.vue'), 'utf-8')

describe('SessionRollsTable', () => {
  it('renders table headers for user, formula, total, date', () => {
    expect(source).toContain("sessions.rollUser")
    expect(source).toContain("sessions.rollFormula")
    expect(source).toContain("sessions.rollTotal")
    expect(source).toContain("common.date")
  })

  it('iterates rolls with v-for', () => {
    expect(source).toContain('v-for="r in rolls"')
  })

  it('shows empty state when no rolls', () => {
    expect(source).toContain("sessions.noRolls")
  })

  it('shows loading state', () => {
    expect(source).toContain("common.loading")
    expect(source).toContain('v-if="loading"')
  })

  it('emits toggle on header click', () => {
    expect(source).toContain("$emit('toggle')")
  })

  it('controls visibility with open prop', () => {
    expect(source).toContain('v-if="open"')
  })

  it('uses chevron icons for expand/collapse', () => {
    expect(source).toContain('chevronUp')
    expect(source).toContain('chevronDown')
  })
})
