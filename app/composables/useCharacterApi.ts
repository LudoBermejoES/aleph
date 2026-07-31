import type { Character, CharacterFolder, CharacterConnection, CharacterNote } from '~/types/api'

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

  // ─── Public notes ───────────────────────────────────────────────────────────
  // The route is /notes/me, never /notes/:userId — a caller can only ever address their own
  // note. Every note on the character arrives with the character read payload.

  function getMyCharacterNote(slug: string) {
    return $fetch<{ note: CharacterNote | null }>(`${base}/characters/${slug}/notes/me`)
  }

  /** Saving an empty or whitespace-only body deletes the note rather than storing a blank. */
  function saveMyCharacterNote(slug: string, body: string) {
    return $fetch<{ note: CharacterNote | null; deleted: boolean }>(
      `${base}/characters/${slug}/notes/me`,
      { method: 'PUT', body: { body } },
    )
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
    getMyCharacterNote,
    saveMyCharacterNote,
    getCharacterFolders,
    updateCharacterFolder,
    deleteCharacterFolder,
    getCharacterOrganizations,
  }
}
