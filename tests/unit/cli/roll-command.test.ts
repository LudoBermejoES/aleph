import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('CLI roll command', () => {
  const rollSource = readFileSync(resolve(__dirname, '../../../cli/src/commands/roll.js'), 'utf-8')

  it('checks config.apiKey (not config.token) for server-side roll recording', () => {
    expect(rollSource).toContain('config.apiKey')
    expect(rollSource).not.toContain('config.token')
  })
})
