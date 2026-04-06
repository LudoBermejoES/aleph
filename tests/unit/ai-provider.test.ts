import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock createError (Nuxt auto-import used in server/utils/ai.ts)
vi.stubGlobal('createError', ({ statusCode, message }: { statusCode: number; message: string }) => {
  const err = new Error(message) as any
  err.statusCode = statusCode
  return err
})
// Stub useRuntimeConfig so the module can be imported without Nuxt instance
vi.stubGlobal('useRuntimeConfig', () => ({ ai: { provider: '', apiKey: '', model: '' } }))

import {
  generateText,
  isAiConfigured,
  SUMMARY_SYSTEM_PROMPT,
  AI_NOTES_SYSTEM_PROMPT,
} from '../../server/utils/ai'

describe('isAiConfigured', () => {
  it('returns false when provider and apiKey are missing', () => {
    expect(isAiConfigured({ provider: '', apiKey: '', model: '' })).toBe(false)
  })

  it('returns false when only provider is set', () => {
    expect(isAiConfigured({ provider: 'claude', apiKey: '', model: '' })).toBe(false)
  })

  it('returns false when only apiKey is set', () => {
    expect(isAiConfigured({ provider: '', apiKey: 'sk-test', model: '' })).toBe(false)
  })

  it('returns true when both provider and apiKey are set', () => {
    expect(isAiConfigured({ provider: 'claude', apiKey: 'sk-test', model: '' })).toBe(true)
  })
})

describe('prompt constants', () => {
  it('SUMMARY_SYSTEM_PROMPT is non-empty', () => {
    expect(SUMMARY_SYSTEM_PROMPT.trim().length).toBeGreaterThan(0)
  })

  it('AI_NOTES_SYSTEM_PROMPT is non-empty', () => {
    expect(AI_NOTES_SYSTEM_PROMPT.trim().length).toBeGreaterThan(0)
  })

  it('prompts are different', () => {
    expect(SUMMARY_SYSTEM_PROMPT).not.toBe(AI_NOTES_SYSTEM_PROMPT)
  })
})

describe('generateText', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws 503 when provider is not configured', async () => {
    await expect(
      generateText('notes', 'system', { provider: '', apiKey: '', model: '' }),
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  it('throws 503 for unknown provider', async () => {
    await expect(
      generateText('notes', 'system', { provider: 'unknown', apiKey: 'key', model: '' }),
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  it('calls Claude API and returns text', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ content: [{ text: 'Generated summary' }] }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await generateText('my notes', 'be a chronicler', {
      provider: 'claude',
      apiKey: 'sk-test',
      model: '',
    })
    expect(result).toBe('Generated summary')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls OpenAI API and returns text', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'OpenAI output' } }] }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await generateText('my notes', 'be an analyst', {
      provider: 'openai',
      apiKey: 'sk-openai',
      model: '',
    })
    expect(result).toBe('OpenAI output')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws 502 on Claude API error response', async () => {
    const mockResponse = { ok: false, status: 401, text: async () => 'Unauthorized' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    await expect(
      generateText('notes', 'system', { provider: 'claude', apiKey: 'sk-test', model: '' }),
    ).rejects.toMatchObject({ statusCode: 502 })
  })

  it('throws 502 on OpenAI API error response', async () => {
    const mockResponse = { ok: false, status: 429, text: async () => 'Rate limited' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    await expect(
      generateText('notes', 'system', { provider: 'openai', apiKey: 'sk-openai', model: '' }),
    ).rejects.toMatchObject({ statusCode: 502 })
  })
})
