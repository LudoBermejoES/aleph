import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

import { withApiHandler } from '../../../server/utils/api-handler'
import { logger } from '../../../server/utils/logger'

// Mock logger before importing api-handler
vi.mock('../../../server/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

const fakeEvent = { path: '/api/test' } as Parameters<typeof withApiHandler>[0]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withApiHandler', () => {
  it('passes through the return value on success', async () => {
    const result = await withApiHandler(fakeEvent, async () => ({ ok: true }))
    expect(result).toEqual({ ok: true })
  })

  it('re-throws H3 errors with their original statusCode', async () => {
    const h3err = createError({ statusCode: 404, message: 'Not found' })
    await expect(
      withApiHandler(fakeEvent, async () => {
        throw h3err
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Not found',
    })
  })

  it('wraps unknown errors in a 500 (no internal leak)', async () => {
    await expect(
      withApiHandler(fakeEvent, async () => {
        throw new Error('db exploded')
      }),
    ).rejects.toMatchObject({ statusCode: 500, message: 'Internal server error' })
  })

  it('logs 4xx H3 errors at warn level', async () => {
    const h3err = createError({ statusCode: 403, message: 'Forbidden' })
    await withApiHandler(fakeEvent, async () => {
      throw h3err
    }).catch(() => {})
    expect(logger.warn).toHaveBeenCalledOnce()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs 5xx H3 errors at error level', async () => {
    const h3err = createError({ statusCode: 503, message: 'Unavailable' })
    await withApiHandler(fakeEvent, async () => {
      throw h3err
    }).catch(() => {})
    expect(logger.error).toHaveBeenCalledOnce()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('logs unexpected errors at error level', async () => {
    await withApiHandler(fakeEvent, async () => {
      throw new Error('boom')
    }).catch(() => {})
    expect(logger.error).toHaveBeenCalledOnce()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
