import { Command } from 'commander'
import { getConfig, clearToken } from '../lib/config.js'
import { success } from '../lib/output.js'

export function makeLogoutCommand() {
  return new Command('logout')
    .description('Revoke stored API key and clear credentials')
    .action(async () => {
      const config = getConfig()
      if (config.apiKey && config.apiKeyId && config.url) {
        try {
          await fetch(`${config.url.replace(/\/$/, '')}/api/apikeys/${config.apiKeyId}`, {
            method: 'DELETE',
            headers: { 'X-API-Key': config.apiKey },
          })
        } catch {
          // Ignore network errors on logout
        }
      }
      clearToken()
      success('Logged out.')
    })
}
