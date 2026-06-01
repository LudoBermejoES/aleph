import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(
  resolve(__dirname, '../../../app/components/ui/scrollable-table/index.vue'),
  'utf-8',
)

describe('ScrollableTable', () => {
  it('wraps slot content in an overflow-x-auto container', () => {
    expect(source).toContain('overflow-x-auto')
  })

  it('renders a slot for content', () => {
    expect(source).toContain('<slot')
  })

  it('applies w-full to fill parent width', () => {
    expect(source).toContain('w-full')
  })
})
