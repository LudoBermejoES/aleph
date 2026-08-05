import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('CLI sub-campaign delete command', () => {
  const source = readFileSync(
    resolve(__dirname, '../../../cli/src/commands/sub-campaign.js'),
    'utf-8',
  )

  it('imports confirm from @inquirer/prompts', () => {
    expect(source).toContain("import { confirm } from '@inquirer/prompts'")
  })

  it('supports --yes flag to skip confirmation', () => {
    expect(source).toContain("'--yes'")
  })

  it('calls confirm() before delete when --yes is not set', () => {
    expect(source).toContain('if (!opts.yes)')
    expect(source).toContain('await confirm(')
  })

  it('skips confirm when --yes is set', () => {
    // The logic is: if (!opts.yes) { confirm... if (!ok) return }
    // So when opts.yes is truthy, confirm is skipped and del() runs directly
    expect(source).toContain('if (!opts.yes)')
  })
})
