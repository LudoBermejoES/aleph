import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'

// Mock h3 before importing validate.ts
const mockCreateError = vi.fn((opts: { statusCode: number; message: string; data?: unknown }) => {
  const err = new Error(opts.message) as Error & { statusCode: number; data: unknown }
  err.statusCode = opts.statusCode
  err.data = opts.data
  return err
})
const mockReadBody = vi.fn()

vi.mock('h3', () => ({
  readBody: (...args: unknown[]) => mockReadBody(...args),
  createError: (...args: unknown[]) =>
    mockCreateError(...(args as [{ statusCode: number; message: string; data?: unknown }])),
}))

const { validateBody } = await import('../../server/utils/validate')

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().optional(),
})

describe('validateBody', () => {
  it('returns parsed data for valid input', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 'Alice', age: 30 })
    const result = await validateBody({} as never, schema)
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  it('throws 422 for missing required field', async () => {
    mockReadBody.mockResolvedValueOnce({ age: 30 })
    const err = await validateBody({} as never, schema).catch((e) => e)
    expect(err.statusCode).toBe(422)
    expect(err.message).toBe('Validation failed')
  })

  it('throws 422 for wrong type', async () => {
    mockReadBody.mockResolvedValueOnce({ name: 42 })
    const err = await validateBody({} as never, schema).catch((e) => e)
    expect(err.statusCode).toBe(422)
  })

  it('throws 422 for null body', async () => {
    mockReadBody.mockResolvedValueOnce(null)
    const err = await validateBody({} as never, schema).catch((e) => e)
    expect(err.statusCode).toBe(422)
  })

  it('includes structured field-level errors', async () => {
    mockCreateError.mockClear()
    mockReadBody.mockResolvedValueOnce({ name: '' })
    await validateBody({} as never, schema).catch(() => {})
    const call = mockCreateError.mock.calls[0]?.[0]
    expect(call?.data?.errors).toBeInstanceOf(Array)
    expect(call?.data?.errors[0]).toHaveProperty('field')
    expect(call?.data?.errors[0]).toHaveProperty('message')
  })
})
