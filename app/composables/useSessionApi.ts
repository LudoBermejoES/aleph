import type { GameSession, SessionDecision, Quest } from '~/types/api'

export function useSessionApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Sessions ───────────────────────────────────────────────────────────────

  function getSessions(params?: Record<string, string>) {
    return $fetch<GameSession[]>(`${base}/sessions`, { params })
  }

  function getSession(slug: string) {
    return $fetch<GameSession>(`${base}/sessions/${slug}`)
  }

  function createSession(body: Record<string, unknown>) {
    return $fetch<GameSession>(`${base}/sessions`, { method: 'POST', body })
  }

  function updateSession(slug: string, body: Record<string, unknown>) {
    return $fetch<GameSession>(`${base}/sessions/${slug}`, { method: 'PUT', body })
  }

  function deleteSession(slug: string) {
    return $fetch(`${base}/sessions/${slug}`, { method: 'DELETE' })
  }

  function getSessionContent(slug: string) {
    return $fetch<Record<string, string | null>>(`${base}/sessions/${slug}/content`)
  }

  function updateSessionContent(slug: string, type: string, content: string) {
    return $fetch(`${base}/sessions/${slug}/content`, { method: 'PUT', body: { type, content } })
  }

  // ─── Sub-Campaigns ───────────────────────────────────────────────────────────

  function getSubCampaigns() {
    return $fetch<Record<string, unknown>[]>(`${base}/sub-campaigns`)
  }

  function createSubCampaign(body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/sub-campaigns`, { method: 'POST', body })
  }

  function updateSubCampaign(slug: string, body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/sub-campaigns/${slug}`, {
      method: 'PUT',
      body,
    })
  }

  function deleteSubCampaign(slug: string) {
    return $fetch(`${base}/sub-campaigns/${slug}`, { method: 'DELETE' })
  }

  function getSessionDecisions(slug: string) {
    return $fetch<SessionDecision[]>(`${base}/sessions/${slug}/decisions`)
  }

  function createDecision(
    slug: string,
    body: { title: string; type?: string; description?: string },
  ) {
    return $fetch(`${base}/sessions/${slug}/decisions`, { method: 'POST', body })
  }

  function createConsequence(
    slug: string,
    decisionId: string,
    body: { description: string; revealed?: boolean },
  ) {
    return $fetch(`${base}/sessions/${slug}/decisions/${decisionId}/consequences`, {
      method: 'POST',
      body,
    })
  }

  function revealConsequence(
    slug: string,
    decisionId: string,
    consequenceId: string,
    revealed: boolean,
  ) {
    return $fetch(`${base}/sessions/${slug}/decisions/${decisionId}/consequences`, {
      method: 'PATCH',
      body: { consequenceId, revealed },
    })
  }

  function patchAttendance(
    slug: string,
    body: { rsvpStatus?: string; attended?: boolean; userId?: string },
  ) {
    return $fetch(`${base}/sessions/${slug}/attendance`, { method: 'PATCH', body })
  }

  function addSessionParticipant(
    slug: string,
    body: { userId: string; characterId?: string; rsvpStatus?: string },
  ) {
    return $fetch<{ success: boolean }>(`${base}/sessions/${slug}/attendance`, {
      method: 'POST',
      body,
    })
  }

  function removeSessionParticipant(slug: string, userId: string) {
    return $fetch<{ success: boolean }>(`${base}/sessions/${slug}/attendance/${userId}`, {
      method: 'DELETE',
    })
  }

  function getSessionRolls(slug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/sessions/${slug}/rolls`)
  }

  function getCampaignArcs(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return $fetch<Record<string, unknown>[]>(`${base}/arcs${query}`)
  }

  function getArcs(params?: Record<string, string>) {
    return getCampaignArcs(params)
  }

  function getArc(slug: string) {
    return $fetch<Record<string, unknown>>(`${base}/arcs/${slug}`)
  }

  function createArc(body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/arcs`, { method: 'POST', body })
  }

  function getChapters(arcId: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/chapters`, { params: { arc_id: arcId } })
  }

  function createChapter(body: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${base}/chapters`, { method: 'POST', body })
  }

  function updateArc(slug: string, body: Record<string, unknown>) {
    return $fetch(`${base}/arcs/${slug}`, { method: 'PUT', body })
  }

  function deleteArc(slug: string) {
    return $fetch(`${base}/arcs/${slug}`, { method: 'DELETE' })
  }

  function updateChapter(slug: string, body: Record<string, unknown>) {
    return $fetch(`${base}/chapters/${slug}`, { method: 'PUT', body })
  }

  function deleteChapter(slug: string) {
    return $fetch(`${base}/chapters/${slug}`, { method: 'DELETE' })
  }

  function deleteSessionContent(sessionSlug: string, contentId: string) {
    return $fetch(`${base}/sessions/${sessionSlug}/content/${contentId}`, { method: 'DELETE' })
  }

  // ─── Quests ─────────────────────────────────────────────────────────────────

  function getQuests(params?: Record<string, string>) {
    return $fetch<Quest[]>(`${base}/quests`, { params })
  }

  function getQuest(slug: string, params?: Record<string, string>) {
    return $fetch<Quest>(`${base}/quests/${slug}`, { params })
  }

  function createQuest(body: Record<string, unknown>) {
    return $fetch<Quest>(`${base}/quests`, { method: 'POST', body })
  }

  function updateQuest(slug: string, body: Record<string, unknown>) {
    return $fetch<Quest>(`${base}/quests/${slug}`, { method: 'PUT', body })
  }

  function deleteQuest(slug: string) {
    return $fetch(`${base}/quests/${slug}`, { method: 'DELETE' })
  }

  return {
    // Sessions
    getSessions,
    getSession,
    createSession,
    updateSession,
    deleteSession,
    getSessionContent,
    updateSessionContent,
    deleteSessionContent,
    getSubCampaigns,
    createSubCampaign,
    updateSubCampaign,
    deleteSubCampaign,
    getSessionDecisions,
    createDecision,
    createConsequence,
    revealConsequence,
    patchAttendance,
    addSessionParticipant,
    removeSessionParticipant,
    getSessionRolls,
    getCampaignArcs,
    getArcs,
    getArc,
    createArc,
    updateArc,
    deleteArc,
    getChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    // Quests
    getQuests,
    getQuest,
    createQuest,
    updateQuest,
    deleteQuest,
  }
}
