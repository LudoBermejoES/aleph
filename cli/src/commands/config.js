import { Command } from 'commander'
import { getConfig, setConfig, getConfigPath } from '../lib/config.js'
import { success, info } from '../lib/output.js'

export function makeConfigCommand() {
  const cmd = new Command('config').description('Manage CLI configuration')

  cmd
    .command('set')
    .description('Set server URL and/or token')
    .option('--url <url>', 'Aleph server URL (e.g. http://localhost:3000)')
    .option('--token <token>', 'API bearer token')
    .action((opts) => {
      if (!opts.url && !opts.token) {
        process.stderr.write('Provide --url and/or --token\n')
        process.exit(1)
      }
      setConfig({ url: opts.url, token: opts.token })
      success('Config saved to ' + getConfigPath())
    })

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = getConfig()
      info('Config file: ' + getConfigPath())
      console.log('url:   ' + (config.url || '(not set)'))
      const masked = config.token
        ? config.token.slice(0, 6) + '***' + config.token.slice(-4)
        : '(not set)'
      console.log('token: ' + masked)
    })

  return cmd
}
