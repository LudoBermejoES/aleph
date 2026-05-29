// Auth helper functions using native fetch for proper cookie handling
// Nuxt's $fetch/ofetch doesn't always propagate Set-Cookie headers in SPA mode

export async function authSignIn(email: string, password: string) {
  const res = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (import.meta.dev) console.error('[Aleph:Auth] signIn failed:', res.status)
    throw { data: { message: data.message || 'Invalid credentials' } }
  }
  return res.json()
}

export async function authSignUp(name: string, email: string, password: string) {
  const res = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    if (import.meta.dev) console.error('[Aleph:Auth] signUp failed:', res.status)
    throw { data: { message: data.message || 'Registration failed' } }
  }
  return res.json()
}

export async function authSignOut() {
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
  })
}

export function useAuthSession() {
  return useCookie('better-auth.session_token')
}

export function useCurrentUser() {
  const { data } = useAsyncData('current-user', () =>
    $fetch<{ id: string; name: string; email: string; role: string } | null>('/api/me').catch(
      () => null,
    ),
  )
  const user = computed(() => data.value ?? null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  return { user, isAdmin }
}
