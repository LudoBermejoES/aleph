export const SUMMARY_SYSTEM_PROMPT = `You are a TTRPG session chronicler. Given the following session notes, write a concise narrative summary suitable for players to review before the next session. Focus on key events, plot developments, and character moments. Write in past tense, third person.`

export const AI_NOTES_SYSTEM_PROMPT = `You are a TTRPG session analyst. Given the following session notes, extract structured information: (1) Key decisions made by the party, (2) NPCs mentioned or encountered, (3) Locations visited or referenced, (4) Plot hooks or unresolved threads. Format each section with a markdown heading.`

export interface AiConfig {
  provider: string
  apiKey: string
  model: string
}

export function isAiConfigured(config?: AiConfig): boolean {
  const ai = config ?? (useRuntimeConfig() as unknown as { ai: AiConfig }).ai
  return !!(ai?.provider && ai?.apiKey)
}

async function callClaude(prompt: string, systemPrompt: string, ai: AiConfig): Promise<string> {
  const model = ai.model || 'claude-sonnet-4-20250514'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ai.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError({ statusCode: 502, message: `Claude API error: ${res.status} ${text}` })
  }

  const data = (await res.json()) as { content?: { text?: string }[] }
  return data.content?.[0]?.text ?? ''
}

async function callOpenAI(prompt: string, systemPrompt: string, ai: AiConfig): Promise<string> {
  const model = ai.model || 'gpt-4o'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw createError({ statusCode: 502, message: `OpenAI API error: ${res.status} ${text}` })
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function generateText(
  prompt: string,
  systemPrompt: string,
  config?: AiConfig,
): Promise<string> {
  const ai: AiConfig = config ?? (useRuntimeConfig() as unknown as { ai: AiConfig }).ai

  if (!ai?.provider || !ai?.apiKey) {
    throw createError({ statusCode: 503, message: 'AI provider is not configured' })
  }

  if (ai.provider === 'claude') {
    return callClaude(prompt, systemPrompt, ai)
  } else if (ai.provider === 'openai') {
    return callOpenAI(prompt, systemPrompt, ai)
  } else {
    throw createError({ statusCode: 503, message: `Unknown AI provider: ${ai.provider}` })
  }
}
