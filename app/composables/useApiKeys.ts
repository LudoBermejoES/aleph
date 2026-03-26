export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: string | Date
  lastUsedAt: string | Date | null
  revokedAt: string | Date | null
}

export interface CreatedApiKey extends ApiKey {
  key: string
}

export function useApiKeys() {
  async function fetchApiKeys(): Promise<ApiKey[]> {
    return await $fetch('/api/apikeys')
  }

  async function createApiKey(name: string): Promise<CreatedApiKey> {
    return await $fetch('/api/apikeys', {
      method: 'POST',
      body: { name },
    })
  }

  async function revokeApiKey(id: string): Promise<void> {
    await $fetch(`/api/apikeys/${id}`, { method: 'DELETE' })
  }

  return { fetchApiKeys, createApiKey, revokeApiKey }
}
