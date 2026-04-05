import { describe, it, expect } from 'vitest'
import { parsePagination, buildMeta } from '../../server/utils/pagination'

describe('parsePagination', () => {
  it('returns defaults when no query params', () => {
    const result = parsePagination({})
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(50)
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })

  it('uses provided page and pageSize', () => {
    const result = parsePagination({ page: '3', pageSize: '20' })
    expect(result.page).toBe(3)
    expect(result.pageSize).toBe(20)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(40)
  })

  it('clamps pageSize to max 200', () => {
    const result = parsePagination({ pageSize: '999' })
    expect(result.pageSize).toBe(200)
    expect(result.limit).toBe(200)
  })

  it('clamps pageSize to min 1', () => {
    const result = parsePagination({ pageSize: '-5' })
    expect(result.pageSize).toBe(1)
    expect(result.limit).toBe(1)
  })

  it('pageSize=0 enables backward compat mode (no pagination)', () => {
    const result = parsePagination({ pageSize: '0' })
    expect(result.pageSize).toBe(0)
    expect(result.limit).toBe(200)
    expect(result.offset).toBe(0)
    expect(result.page).toBe(1)
  })

  it('clamps page to min 1', () => {
    const result = parsePagination({ page: '0' })
    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('clamps negative page to 1', () => {
    const result = parsePagination({ page: '-3' })
    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('handles non-numeric page gracefully', () => {
    const result = parsePagination({ page: 'abc' })
    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('handles non-numeric pageSize gracefully', () => {
    const result = parsePagination({ pageSize: 'abc' })
    expect(result.pageSize).toBe(50)
  })

  it('computes correct offset for page 2', () => {
    const result = parsePagination({ page: '2', pageSize: '10' })
    expect(result.offset).toBe(10)
  })
})

describe('buildMeta', () => {
  it('computes totalPages correctly', () => {
    const params = parsePagination({ page: '1', pageSize: '10' })
    const meta = buildMeta(95, params)
    expect(meta.totalPages).toBe(10)
    expect(meta.total).toBe(95)
    expect(meta.page).toBe(1)
    expect(meta.pageSize).toBe(10)
  })

  it('handles exact page boundary', () => {
    const params = parsePagination({ page: '1', pageSize: '10' })
    const meta = buildMeta(100, params)
    expect(meta.totalPages).toBe(10)
  })

  it('handles zero total', () => {
    const params = parsePagination({ page: '1', pageSize: '10' })
    const meta = buildMeta(0, params)
    expect(meta.totalPages).toBe(0)
    expect(meta.total).toBe(0)
  })

  it('handles pageSize=0 backward compat (totalPages=1)', () => {
    const params = parsePagination({ pageSize: '0' })
    const meta = buildMeta(500, params)
    expect(meta.pageSize).toBe(0)
    expect(meta.totalPages).toBe(1)
    expect(meta.total).toBe(500)
  })

  it('handles single item', () => {
    const params = parsePagination({ page: '1', pageSize: '50' })
    const meta = buildMeta(1, params)
    expect(meta.totalPages).toBe(1)
  })
})
