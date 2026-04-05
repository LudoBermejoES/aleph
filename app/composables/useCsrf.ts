/**
 * Returns fetch options that include the CSRF token header.
 * Use with $fetch or useFetch for all mutating requests (POST/PUT/PATCH/DELETE).
 *
 * Example:
 *   const { csrfHeaders } = useCsrf()
 *   await $fetch('/api/...', { method: 'POST', headers: csrfHeaders(), body: ... })
 */
export function useCsrf() {
  function getCsrfToken(): string | undefined {
    if (import.meta.server) return undefined
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
    return match?.[1]
  }

  function csrfHeaders(): Record<string, string> {
    const token = getCsrfToken()
    if (!token) return {}
    return { 'X-CSRF-Token': token }
  }

  return { csrfHeaders, getCsrfToken }
}
