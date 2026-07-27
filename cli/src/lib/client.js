import { requireConfig } from './config.js'

/**
 * Turn a failed response into one readable line.
 * Server handlers put the human-readable reason in `message` (e.g. `Arc "x" not found`
 * for a 404, the ambiguity explanation for a 409, the arc/chapter mismatch for a 422).
 * Zod validation failures instead send `message: 'Validation failed'` plus per-field
 * errors in `data.errors` — those are appended so the operator sees which field broke.
 */
async function httpErrorMessage(res) {
  let message = `HTTP ${res.status}`
  try {
    const data = await res.json()
    message = data.message || data.statusMessage || data.error || message
    const errors = data.data?.errors
    if (Array.isArray(errors) && errors.length > 0) {
      const detail = errors
        .map((e) => [e.field, e.message].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ')
      if (detail) message += ` (${detail})`
    }
  } catch {
    /* ignore parse errors, use default message */
  }
  return message
}

/**
 * Make an authenticated HTTP request to the Aleph server.
 * Errors are written to stderr and process exits with code 2.
 */
export async function request(method, path, body) {
  const config = requireConfig()
  const url = `${config.url.replace(/\/$/, '')}${path}`

  const options = {
    method,
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
    },
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    process.stderr.write(`Network error: ${err.message}\n`)
    process.exit(2)
  }

  if (!res.ok) {
    process.stderr.write(`Error: ${await httpErrorMessage(res)}\n`)
    process.exit(2)
  }

  if (res.status === 204) return null
  return res.json()
}

export const get = (path) => request('GET', path)
export const post = (path, body) => request('POST', path, body)
export const put = (path, body) => request('PUT', path, body)
export const patch = (path, body) => request('PATCH', path, body)
export const del = (path) => request('DELETE', path)

/**
 * Multipart POST — used for file uploads (e.g. character portraits).
 * fieldName: the form field name the server expects (e.g. 'portrait').
 */
export async function postMultipart(path, filePath, fieldName = 'file') {
  const { basename } = await import('path')
  const config = requireConfig()
  const url = `${config.url.replace(/\/$/, '')}${path}`

  // Use native FormData (Node 18+)
  const form = new FormData()
  const fileBuffer = await import('fs/promises').then((fs) => fs.readFile(filePath))
  const ext = basename(filePath).split('.').pop()?.toLowerCase() ?? 'bin'
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
  const mime = mimeMap[ext] ?? 'application/octet-stream'
  form.append(fieldName, new Blob([fileBuffer], { type: mime }), basename(filePath))

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'X-API-Key': config.apiKey },
      body: form,
    })
  } catch (err) {
    process.stderr.write(`Network error: ${err.message}\n`)
    process.exit(2)
  }

  if (!res.ok) {
    process.stderr.write(`Error: ${await httpErrorMessage(res)}\n`)
    process.exit(2)
  }

  return res.json()
}

/**
 * Resolve an entity slug to its UUID within a campaign.
 * Exits with code 2 if the entity is not found.
 */
export async function resolveEntitySlug(campaignId, slug) {
  const entity = await get(`/api/campaigns/${campaignId}/entities/${slug}`)
  if (!entity || !entity.id) {
    process.stderr.write(`Error: Entity not found: ${slug}\n`)
    process.exit(2)
  }
  return entity.id
}

/**
 * Unauthenticated POST — used for login before API key exists.
 */
export async function postUnauthenticated(baseUrl, path, body) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    process.stderr.write(`Network error: ${err.message}\n`)
    process.exit(2)
  }

  if (!res.ok) {
    process.stderr.write(`Error: ${await httpErrorMessage(res)}\n`)
    process.exit(2)
  }

  return res.json()
}
