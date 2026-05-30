#!/usr/bin/env node
/**
 * scripts/pf2-setup/lib/cli.js
 *
 * HTTP helper that reads ~/.aleph/config.json and provides
 * alephFetch(path, method, body) for API calls to the Aleph server.
 */

import fs from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'
import os from 'os'

const CONFIG_PATH = path.join(os.homedir(), '.aleph', 'config.json')

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Error: no se encontró configuración de Aleph.')
    console.error("Ejecuta 'aleph login' primero.")
    process.exit(1)
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  const config = JSON.parse(raw)
  const serverUrl = config.serverUrl || config.url
  if (!serverUrl || !config.apiKey) {
    console.error('Error: configuración inválida en ~/.aleph/config.json (falta url o apiKey).')
    process.exit(1)
  }
  return { ...config, serverUrl }
}

const config = loadConfig()
const baseUrl = config.serverUrl.replace(/\/$/, '')

export function alephFetch(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${urlPath}`)
    const isHttps = url.protocol === 'https:'
    const proto = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    }

    const bodyStr = body ? JSON.stringify(body) : null
    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr)
    }

    const req = proto.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          return
        }
        try {
          resolve(data ? JSON.parse(data) : null)
        } catch {
          resolve(data)
        }
      })
    })

    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}
