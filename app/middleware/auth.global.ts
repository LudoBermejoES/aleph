export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/register', '/join']
  if (publicRoutes.includes(to.path)) return

  if (import.meta.client) {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      if (!res.ok) {
        return navigateTo('/login')
      }
      const data = await res.json()
      if (!data?.session) {
        return navigateTo('/login')
      }
    } catch (e) {
      if (import.meta.dev) console.error('[Aleph:Middleware] Session check failed:', e)
      return navigateTo('/login')
    }
  }
})
