import { Command } from 'commander'
import { getConfig, setConfig, getConfigPath } from '../lib/config.js'
import { success, info } from '../lib/output.js'

export function makeConfigCommand() {
  const cmd = new Command('config').description('Manage CLI configuration')

  cmd
    .command('set')
    .description('Set server URL and/or token')
    .option('--url <url>', 'Aleph server URL (e.g. http://localhost:3000)')
    .option('--api-key <key>', 'API key (from Settings → API Keys)')
    .action((opts) => {
      if (!opts.url && !opts.apiKey) {
        process.stderr.write('Provide --url and/or --api-key\n')
        process.exit(1)
      }
      setConfig({ url: opts.url, apiKey: opts.apiKey })
      success('Config saved to ' + getConfigPath())
    })

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = getConfig()
      info('Config file: ' + getConfigPath())
      console.log('url:     ' + (config.url || '(not set)'))
      const masked = config.apiKey
        ? config.apiKey.slice(0, 10) + '***' + config.apiKey.slice(-4)
        : '(not set)'
      console.log('api-key: ' + masked)
    })

  return cmd
}
