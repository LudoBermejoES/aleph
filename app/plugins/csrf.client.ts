// Automatically inject X-CSRF-Token on all mutating $fetch requests
export default defineNuxtPlugin(() => {
  const { csrfHeaders } = useCsrf()
  const mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

  const patched = globalThis.$fetch.create({
    onRequest({ options }) {
      const method = ((options.method as string) || 'GET').toUpperCase()
      if (mutating.has(method)) {
        const existing =
          options.headers instanceof Headers
            ? Object.fromEntries((options.headers as Headers).entries())
            : ((options.headers as Record<string, string> | undefined) ?? {})
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options.headers = { ...existing, ...csrfHeaders() } as any
      }
    },
  })

  globalThis.$fetch = patched as typeof $fetch
})
