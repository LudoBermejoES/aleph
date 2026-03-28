/**
 * Central icon map for the Aleph UI.
 * All lucide-vue-next imports live here. Consumers do:
 *   import { ICONS } from '~/utils/icons'
 *   <component :is="ICONS.wiki" class="w-4 h-4 shrink-0" />
 */
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  MapPin,
  Map,
  ScrollText,
  Swords,
  CalendarDays,
  Package,
  Store,
  Archive,
  Coins,
  ArrowLeftRight,
  Network,
  UserCog,
  Settings,
  LogOut,
  Globe,
  BookMarked,
  Landmark,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Check,
  ChevronLeft,
  Search,
  // Character status
  Heart,
  Skull,
  CircleHelp,
  CircleDashed,
  // Quest status
  Play,
  CheckCircle2,
  XCircle,
  Ban,
  // Session status
  Clock,
  Zap,
  X,
  // Org types
  Star,
  Flame,
  Circle,
  Sword,
  Bot,
  // Org statuses
  CircleCheck,
  CircleMinus,
  EyeOff,
  CircleX,
} from 'lucide-vue-next'

export const ICONS = {
  // ─── Navigation areas ─────────────────────────────────────────────────────
  dashboard: LayoutDashboard,
  allCampaigns: LayoutDashboard,
  wiki: BookOpen,
  characters: Users,
  organizations: Building2,
  locations: MapPin,
  maps: Map,
  sessions: ScrollText,
  quests: Swords,
  calendars: CalendarDays,
  items: Package,
  shops: Store,
  inventories: Archive,
  currencies: Coins,
  transactions: ArrowLeftRight,
  graph: Network,
  members: UserCog,

  // ─── Nav group headers ────────────────────────────────────────────────────
  groupWorld: Globe,
  groupStory: BookMarked,
  groupEconomy: Landmark,
  groupCampaign: Shield,

  // ─── Actions ─────────────────────────────────────────────────────────────
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  save: Check,
  back: ChevronLeft,
  signOut: LogOut,
  settings: Settings,
  search: Search,

  // ─── Character status ─────────────────────────────────────────────────────
  alive: Heart,
  dead: Skull,
  missing: CircleHelp,
  unknown: CircleDashed,

  // ─── Character type ───────────────────────────────────────────────────────
  pc: Sword,
  npc: Bot,

  // ─── Quest status ─────────────────────────────────────────────────────────
  questActive: Play,
  questCompleted: CheckCircle2,
  questFailed: XCircle,
  questAbandoned: Ban,

  // ─── Session status ───────────────────────────────────────────────────────
  sessionPlanned: Clock,
  sessionActive: Zap,
  sessionCompleted: CheckCircle2,
  sessionCancelled: X,

  // ─── Organization types ───────────────────────────────────────────────────
  orgFaction: Shield,
  orgGuild: Star,
  orgArmy: Swords,
  orgCult: Flame,
  orgGovernment: Landmark,
  orgOther: Circle,

  // ─── Organization statuses ────────────────────────────────────────────────
  orgActive: CircleCheck,
  orgInactive: CircleMinus,
  orgSecret: EyeOff,
  orgDissolved: CircleX,
} as const

export type IconKey = keyof typeof ICONS
