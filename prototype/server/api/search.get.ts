import { sqlite } from '../db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (!q) {
    return { results: [] }
  }

  // FTS5 search with BM25 ranking
  const results = sqlite.prepare(`
    SELECT
      name,
      snippet(entities_fts, 3, '<mark>', '</mark>', '...', 30) as snippet,
      bm25(entities_fts, 10.0, 8.0, 2.0, 1.0) as score
    FROM entities_fts
    WHERE entities_fts MATCH ?
    ORDER BY score
    LIMIT 20
  `).all(`${q}*`)

  return { results, query: q }
})
