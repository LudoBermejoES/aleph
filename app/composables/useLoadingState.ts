/**
 * Composable for managing loading + error state in list pages.
 */
export function useLoadingState() {
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const result = await fn()
      return result
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Something went wrong'
      return null
    } finally {
      loading.value = false
    }
  }

  function dismissError() {
    error.value = null
  }

  return { loading, error, withLoading, dismissError }
}
