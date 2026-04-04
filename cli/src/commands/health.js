import { Command } from 'commander'
import { get } from '../lib/client.js'
import { print } from '../lib/output.js'

export function makeHealthCommand() {
  const cmd = new Command('health')
    .description('Check server health status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const data = await get('/api/health')
        if (opts.json) {
          print(data, { json: true })
        } else {
          process.stdout.write(`Server status: ${data.status || 'ok'}\n`)
          if (data.version) process.stdout.write(`Version: ${data.version}\n`)
        }
      } catch (err) {
        process.stderr.write(`Error: Cannot connect to server — ${err.message}\n`)
        process.exit(1)
      }
    })

  return cmd
}
