import { requireConfig } from './config.js'

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
      'Authorization': `Bearer ${config.token}`,
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
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {}
    process.stderr.write(`Error: ${message}\n`)
    process.exit(2)
  }

  if (res.status === 204) return null
  return res.json()
}

export const get = (path) => request('GET', path)
export const post = (path, body) => request('POST', path, body)
export const put = (path, body) => request('PUT', path, body)
export const del = (path) => request('DELETE', path)

/**
 * Unauthenticated POST — used for login before token exists.
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
    let message = `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {}
    process.stderr.write(`Error: ${message}\n`)
    process.exit(2)
  }

  return res.json()
}
