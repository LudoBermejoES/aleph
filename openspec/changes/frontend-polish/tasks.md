# Tasks: Frontend Polish & E2E Testing

## 1. Auth Flow Fix

- [x] 1.1 Create `app/composables/useAuth.ts` with native fetch + credentials:include
- [x] 1.2 Export authSignIn, authSignUp, authSignOut helpers with FE logging
- [x] 1.3 Update `app/pages/login.vue` to use authSignIn + window.location.href redirect
- [x] 1.4 Update `app/pages/register.vue` to use authSignUp + window.location.href redirect
- [x] 1.5 Update `app/layouts/default.vue` logout to use authSignOut
- [x] 1.6 Update `app/middleware/auth.global.ts` to validate session via /api/auth/get-session

## 2. Health & Infrastructure

- [x] 2.1 Create `server/api/health.get.ts` (no auth required, returns status/timestamp/version)
- [x] 2.2 Add `/api/health` to auth middleware skip list
- [x] 2.3 Create `app/pages/[...slug].vue` catch-all 404 page
- [x] 2.4 Add error.vue global error page
- [x] 2.5 Set ssr: false (SPA mode) to avoid SSR crashes from client-only libs
- [x] 2.6 Install typescript@5.7 (Vue compiler requirement)
- [x] 2.7 Install lucide-vue-next (shadcn dialog dependency)
- [x] 2.8 Fix Button.vue: inline buttonVariants to avoid barrel import 404
- [x] 2.9 Remove all explicit ~/components/ui/ imports (use Nuxt auto-imports)
- [x] 2.10 Rename EntityGraphView.vue and MapViewer.vue to .client.vue (SSR-safe)

## 3. Campaign Sidebar Navigation

- [x] 3.1 Integrated campaign sidebar directly into default.vue layout
- [x] 3.2 Show campaign sections (Wiki, Characters, Maps, etc.) when inside /campaigns/:id
- [x] 3.3 Highlight active section with bg-sidebar-accent
- [x] 3.4 Show campaign name in sidebar header (needs API call)

## 4. Logging & Observability

- [x] 4.1 Add [Aleph:Auth] console logs to auth composable (signIn, signUp status)
- [x] 4.2 Add [Aleph:Middleware] console logs to auth middleware (session validation)
- [x] 4.3 Add [Aleph] console logs to campaign creation flow
- [x] 4.4 Add Winston debug logs to server auth middleware (accepted/rejected)

## 5. Playwright E2E Tests

- [x] 5.1 Install Playwright chromium browser
- [x] 5.2 Test: Register new user → redirects to campaigns page
- [x] 5.3 Test: Login with valid credentials → see campaigns list
- [x] 5.4 Test: Login with invalid credentials → see error message
- [x] 5.5 Test: Create campaign → redirected to campaign dashboard (campaigns.spec.ts)
- [x] 5.6 Test: Create entity → view entity with markdown rendered (entities.spec.ts)
- [x] 5.7 Test: Search (Ctrl+K) → type query → see results (entities.spec.ts)
- [x] 5.8 Test: Unauthenticated access to /campaigns → redirect to /login
- [x] 5.9 Test: Health endpoint returns 200 with status ok

## 6. Loading & Error States

- [ ] 6.1 Add loading skeleton components for list pages
- [ ] 6.2 Add error toast/notification system
- [ ] 6.3 Add loading state to all page data fetches
- [ ] 6.4 Add empty state illustrations

## 7. Component Tests

- [x] 7.1 Test auth middleware: redirects when no session, passes when valid
- [x] 7.2 Test CampaignSidebar highlights active section

## 8. Rich Text Editor Enhancement

- [x] 8.1 Add strikethrough button (~~text~~)
- [x] 8.2 Add ordered list button (1. 2. 3.)
- [x] 8.3 Add horizontal rule / separator button (---)
- [x] 8.4 Add link insert button (URL input dialog)
- [x] 8.5 Add code block button (``` fenced blocks)
- [x] 8.6 Add task list / checkbox button
- [x] 8.7 Add undo/redo buttons
- [x] 8.8 Add table insert button (with row/col picker)
- [x] 8.9 Install @tiptap/extension-link, @tiptap/extension-task-list, @tiptap/extension-task-item, @tiptap/extension-table

### Unit Tests

- [x] 8.10 Test toolbar button state reflects active marks/nodes
- [x] 8.11 Test link insertion produces correct markdown

## 9. Create Dialogs (Missing Create Buttons)

### 9a. Character Create Dialog

- [x] 9.1 Add "New Character" button + dialog to characters/index.vue
- [x] 9.2 Form fields: name, characterType (pc/npc), race, class, alignment, status, visibility
- [x] 9.3 PC-specific: ownerUserId dropdown (campaign members)
- [x] 9.4 Content field with MarkdownEditor
- [x] 9.5 Submit calls POST /api/campaigns/:id/characters, navigate to detail

### 9b. Calendar Create Dialog

- [x] 9.6 Add "New Calendar" button + dialog to calendars/index.vue
- [x] 9.7 Form fields: name, current year/month/day
- [x] 9.8 Dynamic month list: add/remove months with name + days per month
- [x] 9.9 Optional weekday names list
- [x] 9.10 Submit calls POST /api/campaigns/:id/calendars, navigate to detail

### 9c. Timeline Create Dialog

- [x] 9.11 Add "New Timeline" button + dialog to calendars/index.vue
- [x] 9.12 Form fields: name, description
- [x] 9.13 Submit calls POST /api/campaigns/:id/timelines, navigate to detail

### 9d. Relation Create Dialog

- [x] 9.14 Add "New Relation" button + dialog to graph.vue
- [x] 9.15 Entity picker dropdowns for source and target (search campaign entities)
- [x] 9.16 Relation type dropdown (loads from /api/campaigns/:id/relation-types)
- [x] 9.17 Forward/reverse label inputs, attitude slider (-100 to +100)
- [x] 9.18 Submit calls POST /api/campaigns/:id/relations, reload graph

## 10. Convert Create Dialogs to Full Pages

Replace all create dialogs with dedicated `/new` pages for full-screen forms with MarkdownEditor.

### 10a. Create Pages (replace dialogs with NuxtLink to /new route)

- [x] 10.1 Create `app/pages/campaigns/[id]/entities/new.vue` — full-page entity form (name, type, visibility, tags, content with MarkdownEditor)
- [x] 10.2 Create `app/pages/campaigns/[id]/characters/new.vue` — full-page character form (name, type pc/npc, race, class, alignment, status, owner dropdown for PCs, visibility, content)
- [x] 10.3 Create `app/pages/campaigns/[id]/calendars/new.vue` — full-page calendar form (name, current date, dynamic month list, weekday names, moons, seasons)
- [x] 10.4 Create `app/pages/campaigns/[id]/timelines/new.vue` — timeline form (name, description)
- [x] 10.5 Create `app/pages/campaigns/[id]/sessions/new.vue` — session form (name, scheduled date, description, content)
- [x] 10.6 Create `app/pages/campaigns/[id]/maps/new.vue` — map form (name, dimensions, image upload)
- [x] 10.7 Create `app/pages/campaigns/[id]/quests/new.vue` — quest form (name, status, parent quest, content)
- [x] 10.8 Create `app/pages/campaigns/[id]/items/new.vue` — item form (name, description, weight, value, rarity)
- [x] 10.9 Create `app/pages/campaigns/[id]/shops/new.vue` — shop form (name, description, location)
- [x] 10.10 Create `app/pages/campaigns/[id]/relations/new.vue` — relation form (source/target entity search, type, labels, attitude slider)

### 10b. Update List Pages (replace Dialog with NuxtLink)

- [x] 10.11 Update entities/index.vue — replace Dialog with NuxtLink to /entities/new
- [x] 10.12 Update characters/index.vue — replace Dialog with NuxtLink to /characters/new
- [x] 10.13 Update calendars/index.vue — replace Dialog with NuxtLink to /calendars/new and /timelines/new
- [x] 10.14 Update sessions/index.vue — replace Dialog with NuxtLink to /sessions/new
- [x] 10.15 Update maps/index.vue — replace Dialog with NuxtLink to /maps/new
- [x] 10.16 Update quests/index.vue — replace Dialog with NuxtLink to /quests/new
- [x] 10.17 Update items/index.vue — replace Dialog with NuxtLink to /items/new
- [x] 10.18 Update shops/index.vue — replace Dialog with NuxtLink to /shops/new
- [x] 10.19 Update graph.vue — replace Dialog with NuxtLink to /relations/new

### 10c. Update Existing E2E Tests (dialog → full page selectors)

- [x] 10.20 Update tests/e2e/entities.spec.ts — entity creation uses /entities/new page instead of dialog
- [x] 10.21 Update tests/e2e/create-dialogs.spec.ts — rewrite character/calendar/timeline tests for full page forms
- [x] 10.22 Note: helpers.ts createCampaign() and members.spec.ts invite dialog stay unchanged (simple actions)

### 10d. New E2E Tests

- [x] 10.23 E2E: create character via full page form
- [x] 10.24 E2E: create entity via full page form (in entities.spec.ts)
- [x] 10.25 E2E: create calendar via full page form

### Integration Tests

- [ ] 9.19 Test character create via API with all fields returns correct response
- [ ] 9.20 Test calendar create with configJson returns correct nested structure
- [ ] 9.21 Test relation create validates source/target entities exist

### E2E Tests (legacy — replaced by section 11)

- [x] 9.22 E2E: create character via dialog, verify in list
- [x] 9.23 E2E: create calendar via dialog, verify month grid renders
- [x] 9.24 E2E: create timeline via dialog, verify in list
- [ ] 9.25 E2E: create relation via dialog, verify in graph

## 11. Thorough E2E Create Tests (all fields + detail verification)

Rewrite create E2E tests to fill every form field and verify each persisted value on the detail page.

### 11a. Entity Create (full fields)

- [x] 11.1 Fill name, select type from dropdown, set visibility to dm_only, add tags
- [x] 11.2 Type rich content in MarkdownEditor (heading + paragraph)
- [x] 11.3 Submit → verify detail page shows name, type badge, visibility
- [x] 11.4 Verify markdown content rendered (heading + paragraph visible)

### 11b. Character Create (full fields)

- [x] 11.5 Fill name, select NPC type, set race, class, alignment, status=alive, visibility
- [x] 11.6 Switch to PC type → verify owner dropdown appears, select a member
- [x] 11.7 Type character description in MarkdownEditor
- [x] 11.8 Submit → verify detail page shows name, type badge, race, class, alignment, status
- [x] 11.9 Verify markdown content rendered on detail page

### 11c. Calendar Create (full fields)

- [x] 11.10 Fill name, set current year/month/day
- [x] 11.11 Add 3 months with custom names and day counts
- [x] 11.12 Set weekday names (comma-separated)
- [x] 11.13 Submit → verify calendar grid renders with correct month name
- [x] 11.14 Verify correct number of day cells in grid

### 11d. Timeline Create (full fields)

- [x] 11.15 Fill name and description
- [x] 11.16 Submit → verify timeline detail page shows name
- [x] 11.17 Verify chronicle view renders (empty state)

### 11e. Session Create (full fields)

- [x] 11.18 Fill title, set scheduled date, select status
- [x] 11.19 Type session notes in MarkdownEditor
- [x] 11.20 Submit → verify session detail page shows title, status, date
- [x] 11.21 Verify markdown notes rendered

### 11f. Map Create (full fields)

- [x] 11.22 Fill map name, set visibility
- [x] 11.23 Submit → verify map detail page shows name
- [x] 11.24 Verify map viewer component renders

### 11g. Quest Create (full fields)

- [x] 11.25 Fill name, set status to active, mark as secret
- [x] 11.26 Type quest details in MarkdownEditor
- [x] 11.27 Submit → verify quest appears in quest list with correct status

### 11h. Item Create (full fields)

- [x] 11.28 Fill name, select rarity (legendary), set type, weight, size
- [x] 11.29 Add description text
- [x] 11.30 Submit → verify item appears in item list with correct rarity badge

### 11i. Shop Create (full fields)

- [x] 11.31 Fill shop name and description
- [x] 11.32 Submit → verify shop detail page shows name and description

### 11j. Relation Create (full fields)

- [x] 11.33 Create two entities via API first
- [x] 11.34 Navigate to /relations/new, search and select source entity
- [x] 11.35 Search and select target entity
- [x] 11.36 Set forward/reverse labels, select relation type, adjust attitude slider
- [x] 11.37 Submit → verify relation appears in graph (both nodes + edge visible)
