import { Command } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { makeConfigCommand } from './commands/config.js'
import { makeLoginCommand } from './commands/login.js'
import { makeLogoutCommand } from './commands/logout.js'
import { makeCampaignCommand } from './commands/campaign.js'
import { makeEntityCommand } from './commands/entity.js'
import { makeCharacterCommand } from './commands/character.js'
import { makeSessionCommand } from './commands/session.js'
import { makeMemberCommand } from './commands/member.js'
import { makeSearchCommand } from './commands/search.js'
import { makeRollCommand } from './commands/roll.js'
import { makeOrganizationCommand } from './commands/organization.js'
import { makeLocationCommand } from './commands/location.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program
  .name('aleph')
  .description('CLI for managing Aleph TTRPG campaigns')
  .version(pkg.version)
  // --no-color is handled automatically by chalk when NO_COLOR env var is set
  // or when stdout is not a TTY. chalk also respects FORCE_COLOR.

program.addCommand(makeConfigCommand())
program.addCommand(makeLoginCommand())
program.addCommand(makeLogoutCommand())
program.addCommand(makeCampaignCommand())
program.addCommand(makeEntityCommand())
program.addCommand(makeCharacterCommand())
program.addCommand(makeSessionCommand())
program.addCommand(makeMemberCommand())
program.addCommand(makeSearchCommand())
program.addCommand(makeRollCommand())
program.addCommand(makeOrganizationCommand())
program.addCommand(makeLocationCommand())

program.parse(process.argv)
