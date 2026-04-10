export function useCharacterFilters(_campaignId: string) {
  const route = useRoute()
  const router = useRouter()

  const typeFilter = ref('all')
  const selectedFolder = ref('')
  const searchInput = ref('')
  const statusFilter = ref('')
  const orgFilter = ref('')
  const locationFilter = ref('')
  const showCompanions = ref(true)
  const sortField = ref('updatedAt')
  const sortDir = ref('desc')

  function initFromUrl() {
    const q = route.query
    typeFilter.value = (q.type as string) || 'all'
    selectedFolder.value = (q.folderId as string) || ''
    searchInput.value = (q.search as string) || ''
    statusFilter.value = (q.status as string) || ''
    orgFilter.value = (q.org as string) || ''
    locationFilter.value = (q.location as string) || ''
    showCompanions.value = q.companions !== 'false'
    sortField.value = (q.sort as string) || 'updatedAt'
    sortDir.value = (q.sortDir as string) || 'desc'
  }

  function syncUrl() {
    const q: Record<string, string> = {}
    if (typeFilter.value !== 'all') q.type = typeFilter.value
    if (selectedFolder.value) q.folderId = selectedFolder.value
    if (searchInput.value) q.search = searchInput.value
    if (statusFilter.value) q.status = statusFilter.value
    if (orgFilter.value) q.org = orgFilter.value
    if (locationFilter.value) q.location = locationFilter.value
    if (!showCompanions.value) q.companions = 'false'
    if (sortField.value !== 'updatedAt') q.sort = sortField.value
    if (sortDir.value !== 'desc') q.sortDir = sortDir.value
    router.replace({ query: q })
  }

  function buildParams() {
    const params: Record<string, string> = {}
    if (typeFilter.value !== 'all') params.type = typeFilter.value
    if (selectedFolder.value) params.folderId = selectedFolder.value
    if (searchInput.value) params.search = searchInput.value
    if (statusFilter.value) params.status = statusFilter.value
    if (orgFilter.value) params.organizationId = orgFilter.value
    if (locationFilter.value) params.locationEntityId = locationFilter.value
    if (!showCompanions.value) params.companions = 'false'
    params.sort = sortField.value
    params.sortDir = sortDir.value
    return params
  }

  function onFilterChange(loadFn: () => void) {
    syncUrl()
    loadFn()
  }

  function setType(type: string, loadFn: () => void) {
    typeFilter.value = type
    selectedFolder.value = ''
    onFilterChange(loadFn)
  }

  function toggleSortDir(loadFn: () => void) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    onFilterChange(loadFn)
  }

  return {
    typeFilter,
    selectedFolder,
    searchInput,
    statusFilter,
    orgFilter,
    locationFilter,
    showCompanions,
    sortField,
    sortDir,
    initFromUrl,
    syncUrl,
    buildParams,
    onFilterChange,
    setType,
    toggleSortDir,
  }
}
