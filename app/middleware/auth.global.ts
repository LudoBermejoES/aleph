export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/register']
  if (publicRoutes.includes(to.path)) return

  if (import.meta.client) {
    console.log('[Aleph:Middleware] Checking session for route:', to.path)
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' })
      console.log('[Aleph:Middleware] Session check status:', res.status)
      if (!res.ok) {
        console.log('[Aleph:Middleware] No valid session, redirecting to /login')
        return navigateTo('/login')
      }
      const data = await res.json()
      if (!data?.session) {
        console.log('[Aleph:Middleware] No session data, redirecting to /login')
        return navigateTo('/login')
      }
      console.log('[Aleph:Middleware] Session valid for user:', data.user?.email)
    } catch (e) {
      console.error('[Aleph:Middleware] Session check failed:', e)
      return navigateTo('/login')
    }
  }
})
