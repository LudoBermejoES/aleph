import { Command } from 'commander'
import { get, post } from '../lib/client.js'
import { print, success } from '../lib/output.js'

export function makeMemberCommand() {
  const cmd = new Command('member').description('Manage campaign members')

  cmd
    .command('list')
    .description('List members of a campaign')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await get(`/api/campaigns/${opts.campaign}/members`)
      if (opts.json) {
        print(data, { json: true })
      } else {
        print(data.map(m => ({ name: m.name, email: m.email, role: m.role })))
      }
    })

  cmd
    .command('invite')
    .description('Generate an invitation link')
    .requiredOption('--campaign <id>', 'Campaign ID')
    .requiredOption('--role <role>', 'Role (player, editor, co_dm)')
    .option('--expires <days>', 'Expiry in days', '7')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const data = await post(`/api/campaigns/${opts.campaign}/invite`, {
        role: opts.role,
        expiresInDays: parseInt(opts.expires),
      })
      if (opts.json) {
        print(data, { json: true })
      } else {
        success('Invite URL: ' + data.url)
      }
    })

  return cmd
}
