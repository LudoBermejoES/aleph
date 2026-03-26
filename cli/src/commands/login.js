import { Command } from 'commander'
import { input, password } from '@inquirer/prompts'
import { getConfig, setConfig } from '../lib/config.js'
import { postUnauthenticated } from '../lib/client.js'
import { success } from '../lib/output.js'

export function makeLoginCommand() {
  return new Command('login')
    .description('Authenticate with an Aleph server and store an API key')
    .option('--url <url>', 'Server URL (overrides stored config)')
    .action(async (opts) => {
      const config = getConfig()
      let url = opts.url || config.url

      if (!url) {
        url = await input({ message: 'Server URL (e.g. http://localhost:3333):' })
        if (!url) {
          process.stderr.write('Server URL is required.\n')
          process.exit(1)
        }
      }

      const email = await input({ message: 'Email:' })
      const pass = await password({ message: 'Password:' })

      // First authenticate via better-auth to get a cookie session token,
      // then use it to create an API key.
      const authData = await postUnauthenticated(url, '/api/auth/sign-in/email', {
        email,
        password: pass,
      })

      if (!authData?.session?.token) {
        process.stderr.write('Login failed: invalid credentials\n')
        process.exit(1)
      }

      // Create an API key using the session cookie
      const sessionToken = authData.session.token
      const keyRes = await fetch(`${url.replace(/\/$/, '')}/api/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${sessionToken}`,
        },
        body: JSON.stringify({ name: 'aleph-cli' }),
      })

      if (!keyRes.ok) {
        process.stderr.write(`Failed to create API key: HTTP ${keyRes.status}\n`)
        process.exit(2)
      }

      const keyData = await keyRes.json()
      setConfig({ url, apiKey: keyData.key, apiKeyId: keyData.id })
      success(`Logged in. API key stored (prefix: ${keyData.keyPrefix}).`)
    })
}
