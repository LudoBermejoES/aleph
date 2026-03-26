import { Command } from 'commander'
import { input, password } from '@inquirer/prompts'
import { getConfig, setConfig } from '../lib/config.js'
import { postUnauthenticated } from '../lib/client.js'
import { success } from '../lib/output.js'

export function makeLoginCommand() {
  return new Command('login')
    .description('Authenticate with an Aleph server and store credentials')
    .option('--url <url>', 'Server URL (overrides stored config)')
    .action(async (opts) => {
      const config = getConfig()
      const url = opts.url || config.url

      if (!url) {
        process.stderr.write('Server URL required. Run: aleph config set --url <url>\n')
        process.exit(1)
      }

      const email = await input({ message: 'Email:' })
      const pass = await password({ message: 'Password:' })

      const data = await postUnauthenticated(url, '/api/cli/token', { email, password: pass })

      setConfig({ url, token: data.token })
      success('Logged in. Token stored.')
    })
}
