import { describe, it, expect } from 'vitest'
import { entities } from '../../../server/db/schema/entities'

describe('Entity image schema', () => {
  it('entities table has imageUrl column', () => {
    expect(entities.imageUrl).toBeDefined()
    expect(entities.imageUrl.name).toBe('image_url')
  })
})
