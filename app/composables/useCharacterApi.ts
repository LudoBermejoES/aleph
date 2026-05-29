import type { Character, CharacterFolder, CharacterConnection } from '~/types/api'

export function useCharacterApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Characters ─────────────────────────────────────────────────────────────

  function getCharacters(params?: Record<string, string>) {
    return $fetch<Character[]>(`${base}/characters`, { params: { pageSize: '0', ...params } })
  }

  function getCharacter(slug: string, params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return $fetch<Character>(`${base}/characters/${slug}${query}`)
  }

  function createCharacter(body: Record<string, unknown>) {
    return $fetch<Character>(`${base}/characters`, { method: 'POST', body })
  }

  function updateCharacter(slug: string, body: Record<string, unknown>) {
    return $fetch<Character>(`${base}/characters/${slug}`, { method: 'PUT', body })
  }

  function deleteCharacter(slug: string) {
    return $fetch(`${base}/characters/${slug}`, { method: 'DELETE' })
  }

  function deleteAbility(characterSlug: string, abilityId: string) {
    return $fetch(`${base}/characters/${characterSlug}/abilities/${abilityId}`, {
      method: 'DELETE',
    })
  }

  function getCharacterOrganizations(slug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/characters/${slug}/organizations`)
  }

  function getCharacterConnections(slug: string) {
    return $fetch<CharacterConnection[]>(`${base}/characters/${slug}/connections`)
  }

  function deleteCharacterConnection(slug: string, connectionId: string) {
    return $fetch(`${base}/characters/${slug}/connections/${connectionId}`, { method: 'DELETE' })
  }

  function getCharacterFolders() {
    return $fetch<CharacterFolder[]>(`${base}/character-folders`)
  }

  function updateCharacterFolder(folderId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/character-folders/${folderId}`, { method: 'PUT', body })
  }

  function deleteCharacterFolder(folderId: string) {
    return $fetch(`${base}/character-folders/${folderId}`, { method: 'DELETE' })
  }

  return {
    getCharacters,
    getCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    deleteAbility,
    getCharacterConnections,
    deleteCharacterConnection,
    getCharacterFolders,
    updateCharacterFolder,
    deleteCharacterFolder,
    getCharacterOrganizations,
  }
}
