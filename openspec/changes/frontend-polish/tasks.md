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

- [ ] 10.1 Create `app/pages/campaigns/[id]/entities/new.vue` — full-page entity form (name, type, visibility, tags, content with MarkdownEditor)
- [ ] 10.2 Create `app/pages/campaigns/[id]/characters/new.vue` — full-page character form (name, type pc/npc, race, class, alignment, status, owner dropdown for PCs, visibility, content)
- [ ] 10.3 Create `app/pages/campaigns/[id]/calendars/new.vue` — full-page calendar form (name, current date, dynamic month list, weekday names, moons, seasons)
- [ ] 10.4 Create `app/pages/campaigns/[id]/timelines/new.vue` — timeline form (name, description)
- [ ] 10.5 Create `app/pages/campaigns/[id]/sessions/new.vue` — session form (name, scheduled date, description, content)
- [ ] 10.6 Create `app/pages/campaigns/[id]/maps/new.vue` — map form (name, dimensions, image upload)
- [ ] 10.7 Create `app/pages/campaigns/[id]/quests/new.vue` — quest form (name, status, parent quest, content)
- [ ] 10.8 Create `app/pages/campaigns/[id]/items/new.vue` — item form (name, description, weight, value, rarity)
- [ ] 10.9 Create `app/pages/campaigns/[id]/shops/new.vue` — shop form (name, description, location)
- [ ] 10.10 Create `app/pages/campaigns/[id]/relations/new.vue` — relation form (source/target entity search, type, labels, attitude slider)

### 10b. Update List Pages (replace Dialog with NuxtLink)

- [ ] 10.11 Update entities/index.vue — replace Dialog with NuxtLink to /entities/new
- [ ] 10.12 Update characters/index.vue — replace Dialog with NuxtLink to /characters/new
- [ ] 10.13 Update calendars/index.vue — replace Dialog with NuxtLink to /calendars/new and /timelines/new
- [ ] 10.14 Update sessions/index.vue — replace Dialog with NuxtLink to /sessions/new
- [ ] 10.15 Update maps/index.vue — replace Dialog with NuxtLink to /maps/new
- [ ] 10.16 Update quests/index.vue — replace Dialog with NuxtLink to /quests/new
- [ ] 10.17 Update items/index.vue — replace Dialog with NuxtLink to /items/new
- [ ] 10.18 Update shops/index.vue — replace Dialog with NuxtLink to /shops/new
- [ ] 10.19 Update graph.vue — replace Dialog with NuxtLink to /relations/new

### 10c. Tests

- [ ] 10.20 E2E: create character via full page form
- [ ] 10.21 E2E: create entity via full page form
- [ ] 10.22 E2E: create calendar via full page form

### Integration Tests

- [ ] 9.19 Test character create via API with all fields returns correct response
- [ ] 9.20 Test calendar create with configJson returns correct nested structure
- [ ] 9.21 Test relation create validates source/target entities exist

### E2E Tests

- [x] 9.22 E2E: create character via dialog, verify in list
- [x] 9.23 E2E: create calendar via dialog, verify month grid renders
- [x] 9.24 E2E: create timeline via dialog, verify in list
- [ ] 9.25 E2E: create relation via dialog, verify in graph
