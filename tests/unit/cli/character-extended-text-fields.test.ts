import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/character.js'), 'utf-8')

describe('character update — extended text field flags', () => {
  it('declares --backstory option', () => {
    expect(source).toContain("'--backstory <markdown>'")
  })

  it('declares --backstory-stdin flag', () => {
    expect(source).toContain("'--backstory-stdin'")
  })

  it('declares --history option', () => {
    expect(source).toContain("'--history <markdown>'")
  })

  it('declares --history-stdin flag', () => {
    expect(source).toContain("'--history-stdin'")
  })

  it('declares --current-status option', () => {
    expect(source).toContain("'--current-status <markdown>'")
  })

  it('declares --current-status-stdin flag', () => {
    expect(source).toContain("'--current-status-stdin'")
  })

  it('maps --backstory to body.backstory', () => {
    expect(source).toContain('body.backstory')
  })

  it('maps --history to body.history', () => {
    expect(source).toContain('body.history')
  })

  it('maps --current-status to body.currentStatus', () => {
    expect(source).toContain('body.currentStatus')
  })

  it('rejects --backstory and --backstory-stdin together', () => {
    expect(source).toContain('--backstory and --backstory-stdin are mutually exclusive')
  })

  it('rejects --history and --history-stdin together', () => {
    expect(source).toContain('--history and --history-stdin are mutually exclusive')
  })

  it('rejects --current-status and --current-status-stdin together', () => {
    expect(source).toContain('--current-status and --current-status-stdin are mutually exclusive')
  })

  it('error message mentions --backstory in the "at least one field" list', () => {
    expect(source).toContain('--backstory')
  })
})
