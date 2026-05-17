export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.client) {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (!res.ok) return navigateTo('/login')
    const data = await res.json()
    if (data?.role !== 'admin') return navigateTo('/settings')
  }
})
