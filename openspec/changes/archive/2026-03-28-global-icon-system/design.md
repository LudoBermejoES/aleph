## Context

`lucide-vue-next ^1.0.0` is already in `package.json` but zero icons are rendered anywhere in the UI. The app has ~15 navigation areas, ~13 dashboard cards, and dozens of status/type badges — all plain text. The sidebar groups (World, Story, Economy, Campaign) have chevron toggles but no thematic icons. Users must read every label to orient themselves.

## Goals / Non-Goals

**Goals:**
- Every sidebar nav link has a leading icon
- Every nav group header has a leading icon
- Every campaign dashboard card has a large icon
- Common action buttons (New, Save, Delete, Edit, Back, Sign Out, Settings) have icons
- Status/type badges (character status, quest status, session status, org type/status) have icons
- A single central file (`app/utils/icons.ts`) owns the icon→component mapping so future additions are one-line changes

**Non-Goals:**
- Custom SVG icons or icon fonts — lucide-vue-next only
- Animated icons
- Icon picker UI for DMs to customise per-entity icons
- Replacing the existing Aleph logo PNG

## Decisions

### 1. Central `app/utils/icons.ts` export map

All icon components are imported once and re-exported as a plain object keyed by semantic name (e.g. `ICONS.characters`, `ICONS.alive`, `ICONS.delete`). Consumers do `import { ICONS } from '~/utils/icons'` and bind `<component :is="ICONS.characters" />`.

**Alternative considered**: Import icons directly in each component file. Rejected — scatters 60+ imports across 15+ files, makes global changes (e.g. swapping an icon) require touching every file.

### 2. Inline `<component :is="...">` rather than a wrapper component

No `<AppIcon name="characters" />` wrapper component. Lucide components are already Vue components; wrapping them adds an extra layer with no benefit for a static icon set.

**Alternative considered**: `<AppIcon>` wrapper with size/color props. Rejected — over-engineering for a set of icons that all use the same default size (16px inline, 20px for dashboard cards). Tailwind classes handle sizing directly.

### 3. Icon sizing via Tailwind classes

- Sidebar nav: `class="w-4 h-4 shrink-0"` (16px)
- Dashboard cards: `class="w-6 h-6"` (24px)
- Action buttons: `class="w-4 h-4"` (16px)
- Nav group headers: `class="w-3.5 h-3.5"` (14px)
- Status badges: `class="w-3 h-3"` (12px)

### 4. Icon assignments

| Area | Icon |
|------|------|
| Dashboard / All Campaigns | `LayoutDashboard` |
| Wiki / Entities | `BookOpen` |
| Characters | `Users` |
| Organizations | `Building2` |
| Locations | `MapPin` |
| Maps | `Map` |
| Sessions | `ScrollText` |
| Quests | `Swords` |
| Calendars | `CalendarDays` |
| Items | `Package` |
| Shops | `Store` |
| Inventories | `Archive` |
| Currencies | `Coins` |
| Transactions | `ArrowLeftRight` |
| Graph | `Network` |
| Members | `UserCog` |
| Settings | `Settings` |
| Sign Out | `LogOut` |
| World group | `Globe` |
| Story group | `BookMarked` |
| Economy group | `Landmark` |
| Campaign group | `Shield` |
| New / Add | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Save | `Check` |
| Back | `ChevronLeft` |
| Search | `Search` |
| **Status: alive** | `Heart` |
| **Status: dead** | `Skull` |
| **Status: missing** | `CircleHelp` |
| **Status: unknown** | `CircleDashed` |
| **Quest: active** | `Play` |
| **Quest: completed** | `CheckCircle2` |
| **Quest: failed** | `XCircle` |
| **Quest: abandoned** | `Ban` |
| **Session: planned** | `Clock` |
| **Session: active** | `Zap` |
| **Session: completed** | `CheckCircle2` |
| **Session: cancelled** | `X` |
| **Org type: faction** | `Shield` |
| **Org type: guild** | `Star` |
| **Org type: army** | `Swords` |
| **Org type: cult** | `Flame` |
| **Org type: government** | `Landmark` |
| **Org type: other** | `Circle` |
| **Org status: active** | `CircleCheck` |
| **Org status: inactive** | `CircleMinus` |
| **Org status: secret** | `EyeOff` |
| **Org status: dissolved** | `CircleX` |
| PC badge | `Sword` |
| NPC badge | `Bot` |

## Risks / Trade-offs

- **Bundle size** → Lucide tree-shakes per-component; only imported icons are bundled. No risk.
- **Icon drift** (future nav items added without icons) → Mitigated by central `icons.ts` — adding a nav item without a matching icon entry will be visually obvious (missing icon slot) and easy to catch in code review.
- **Subjective icon choices** → Some mappings are debatable (e.g. `Swords` for Quests vs `Target`). Choices favour TTRPG thematic fit. Easy to change in `icons.ts` later.
