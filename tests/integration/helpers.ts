const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: any }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

/**
 * Sign up + sign in, returning { cookie, csrfToken } ready for use.
 * The CSRF token is obtained by making a GET to /api/campaigns after login.
 */
export async function signUpAndLogin(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const loginRes = await apiRaw('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password },
  })
  const loginCookies = loginRes.headers.get('set-cookie') || ''
  const sessionMatch = loginCookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = sessionMatch ? `better-auth.session_token=${sessionMatch[1]}` : ''

  // Make an authenticated GET so the auth middleware sets the csrf_token cookie
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

  return { cookie: fullCookie, csrfToken }
}

/**
 * Sign up, sign in, create an API key, and return the raw API key string.
 */
export async function signUpAndGetApiKey(
  email: string,
  password = 'password123',
  name = 'Test User',
) {
  const { cookie, csrfToken } = await signUpAndLogin(email, password, name)
  const keyRes = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'test-key' },
  })
  const data = await keyRes.json()
  return data.key as string
}
