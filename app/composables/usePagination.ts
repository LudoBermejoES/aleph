import { useRoute, useRouter } from 'vue-router'

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function usePagination(defaultPageSize = 50) {
  const route = useRoute()
  const router = useRouter()

  const page = computed(() => Number(route.query.page ?? 1))
  const pageSize = computed(() => Number(route.query.pageSize ?? defaultPageSize))
  const meta = ref<PaginationMeta | null>(null)
  const totalPages = computed(() => meta.value?.totalPages ?? 1)
  const total = computed(() => meta.value?.total ?? 0)

  function setPage(p: number) {
    router.replace({ query: { ...route.query, page: p === 1 ? undefined : String(p) } })
  }

  function queryParams(): Record<string, string> {
    const params: Record<string, string> = { pageSize: String(pageSize.value) }
    if (page.value > 1) params.page = String(page.value)
    return params
  }

  function updateMeta(m: PaginationMeta) {
    meta.value = m
  }

  return { page, pageSize, meta, totalPages, total, setPage, queryParams, updateMeta }
}
