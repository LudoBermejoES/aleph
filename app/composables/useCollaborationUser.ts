/**
 * Returns the current user's name and a deterministic color for collaborative cursors.
 * Color is derived by hashing the user ID to an HSL hue so it's consistent across sessions.
 */
export function useCollaborationUser() {
  const userName = ref('Anonymous')
  const userColor = ref('#9ca3af')

  function hashToHue(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 360
  }

  onMounted(async () => {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (data?.user?.name) userName.value = data.user.name
      if (data?.user?.id) {
        const hue = hashToHue(data.user.id)
        userColor.value = `hsl(${hue}, 70%, 50%)`
      }
    } catch { /* keep defaults */ }
  })

  return { userName, userColor }
}
