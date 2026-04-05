const MAX_PAGE_SIZE = 200
const DEFAULT_PAGE_SIZE = 50

export interface PaginationParams {
  limit: number
  offset: number
  page: number
  pageSize: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page ?? 1)
  const rawPageSize = Number(query.pageSize ?? DEFAULT_PAGE_SIZE)

  // pageSize=0 means "no pagination" (backward compat) — return everything
  if (rawPageSize === 0) {
    return { limit: MAX_PAGE_SIZE, offset: 0, page: 1, pageSize: 0 }
  }

  const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(rawPageSize) ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE),
  )

  return { limit: pageSize, offset: (page - 1) * pageSize, page, pageSize }
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  const effectivePageSize = params.pageSize === 0 ? total : params.pageSize
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: effectivePageSize > 0 ? Math.ceil(total / effectivePageSize) : 1,
  }
}
