import { Command } from 'commander'
import { getConfig, clearToken } from '../lib/config.js'
import { success } from '../lib/output.js'

export function makeLogoutCommand() {
  return new Command('logout')
    .description('Revoke CLI token and clear stored credentials')
    .action(async () => {
      const config = getConfig()
      if (config.token && config.url) {
        try {
          await fetch(`${config.url.replace(/\/$/, '')}/api/cli/token`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${config.token}` },
          })
        } catch {
          // Ignore network errors on logout
        }
      }
      clearToken()
      success('Logged out.')
    })
}
