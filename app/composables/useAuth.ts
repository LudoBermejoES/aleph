// Auth helper functions using native fetch for proper cookie handling
// Nuxt's $fetch/ofetch doesn't always propagate Set-Cookie headers in SPA mode

export async function authSignIn(email: string, password: string) {
  console.log('[Aleph:Auth] signIn attempt for:', email)
  const res = await fetch('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  })
  console.log('[Aleph:Auth] signIn response status:', res.status)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[Aleph:Auth] signIn failed:', data.message || res.statusText)
    throw { data: { message: data.message || 'Invalid credentials' } }
  }
  const data = await res.json()
  console.log('[Aleph:Auth] signIn success, user:', data.user?.email)
  return data
}

export async function authSignUp(name: string, email: string, password: string) {
  console.log('[Aleph:Auth] signUp attempt for:', email)
  const res = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
    credentials: 'include',
  })
  console.log('[Aleph:Auth] signUp response status:', res.status)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[Aleph:Auth] signUp failed:', data.message || res.statusText)
    throw { data: { message: data.message || 'Registration failed' } }
  }
  const data = await res.json()
  console.log('[Aleph:Auth] signUp success, user:', data.user?.email)
  return data
}

export async function authSignOut() {
  console.log('[Aleph:Auth] signOut')
  await fetch('/api/auth/sign-out', {
    method: 'POST',
    credentials: 'include',
  })
}

export function useAuthSession() {
  return useCookie('better-auth.session_token')
}
