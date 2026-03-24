export default defineNuxtRouteMiddleware((to) => {
  const publicRoutes = ['/login', '/register']
  if (publicRoutes.includes(to.path)) return

  // Check for session cookie (Better Auth sets it)
  const cookie = useCookie('better-auth.session_token')
  if (!cookie.value) {
    return navigateTo('/login')
  }
})
