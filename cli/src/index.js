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
import { makeSessionGroupCommand } from './commands/session-group.js'
import { makeMemberCommand } from './commands/member.js'
import { makeSearchCommand } from './commands/search.js'
import { makeRollCommand } from './commands/roll.js'
import { makeOrganizationCommand } from './commands/organization.js'
import { makeLocationCommand } from './commands/location.js'
import { makeRelationCommand } from './commands/relation.js'
import { makeMapCommand } from './commands/map.js'
import { makeQuestCommand } from './commands/quest.js'
import { makeCalendarCommand } from './commands/calendar.js'
import { makeTimelineCommand } from './commands/timeline.js'
import { makeItemCommand } from './commands/item.js'
import { makeShopCommand } from './commands/shop.js'
import { makeCurrencyCommand } from './commands/currency.js'
import { makeTransactionCommand } from './commands/transaction.js'
import { makeInventoryCommand } from './commands/inventory.js'
import { makeTemplateCommand } from './commands/template.js'
import { makeTagCommand } from './commands/tag.js'
import { makeArcCommand } from './commands/arc.js'
import { makeChapterCommand } from './commands/chapter.js'
import { makeHealthCommand } from './commands/health.js'
import { makeDiagramCommand } from './commands/diagram.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

const program = new Command()

program.name('aleph').description('CLI for managing Aleph TTRPG campaigns').version(pkg.version)
// --no-color is handled automatically by chalk when NO_COLOR env var is set
// or when stdout is not a TTY. chalk also respects FORCE_COLOR.

program.addCommand(makeConfigCommand())
program.addCommand(makeLoginCommand())
program.addCommand(makeLogoutCommand())
program.addCommand(makeCampaignCommand())
program.addCommand(makeEntityCommand())
program.addCommand(makeCharacterCommand())
program.addCommand(makeSessionCommand())
program.addCommand(makeSessionGroupCommand())
program.addCommand(makeMemberCommand())
program.addCommand(makeSearchCommand())
program.addCommand(makeRollCommand())
program.addCommand(makeOrganizationCommand())
program.addCommand(makeLocationCommand())
program.addCommand(makeRelationCommand())
program.addCommand(makeMapCommand())
program.addCommand(makeQuestCommand())
program.addCommand(makeCalendarCommand())
program.addCommand(makeTimelineCommand())
program.addCommand(makeItemCommand())
program.addCommand(makeShopCommand())
program.addCommand(makeCurrencyCommand())
program.addCommand(makeTransactionCommand())
program.addCommand(makeInventoryCommand())
program.addCommand(makeTemplateCommand())
program.addCommand(makeTagCommand())
program.addCommand(makeArcCommand())
program.addCommand(makeChapterCommand())
program.addCommand(makeHealthCommand())
program.addCommand(makeDiagramCommand())

program.parse(process.argv)
