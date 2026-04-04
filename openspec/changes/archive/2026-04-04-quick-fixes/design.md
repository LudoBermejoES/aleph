## Context

These ten items were identified during a codebase-wide review. Each is small and self-contained. They span the frontend, CLI, configuration, and i18n layers but share no complex dependencies, so they can be implemented and tested independently.

The project already has a toast/notification pattern (shadcn-vue `useToast`), runtime config for public values, and i18n infrastructure in `i18n/locales/`. The fixes leverage existing patterns rather than introducing new ones.

## Goals / Non-Goals

**Goals:**
- Hocuspocus WebSocket URL is configurable via `NUXT_PUBLIC_HOCUSPOCUS_URL` (defaults to same-origin `/ws`)
- Graph node clicks navigate to the entity detail page
- CLI roll recording works with the current `apiKey`-based auth
- All user-facing error feedback uses toast, not `alert()`
- 404 page and auth layout are fully internationalized
- `.env.example` documents all required and optional env vars
- `ora` removed from CLI deps
- `docker-compose.yml` includes `env_file: .env`
- CLI session-group delete prompts for confirmation unless `--yes` is passed

**Non-Goals:**
- No new features or UI redesigns
- No migration or schema changes
- No changes to the auth model itself (just fixing the CLI key name)
- No comprehensive alert/confirm audit beyond the five identified pages

## Decisions

**Decision 1: Hocuspocus URL via `runtimeConfig.public.hocuspocusUrl`**
Use Nuxt runtime config (`NUXT_PUBLIC_HOCUSPOCUS_URL`) with a sensible default. This keeps configuration consistent with how other public URLs are managed and allows per-environment override without code changes.

**Decision 2: Graph navigation via `navigateTo`**
On node click, call `navigateTo(/campaigns/${campaignId}/entities/${nodeId})`. No confirmation dialog needed — clicking a node is a standard navigation action.

**Decision 3: Toast for errors instead of `alert()`**
Use `useToast()` from the existing shadcn-vue setup. This keeps error presentation consistent across the app and is non-blocking.

**Decision 4: CLI confirmation via `readline` prompt**
Use Node.js built-in `readline` for the delete confirmation. No new dependency needed. The `--yes` / `-y` flag skips the prompt for scripting use.

**Decision 5: `.env.example` is documentation only**
The file is committed but `.env` stays in `.gitignore`. Variables are commented with descriptions and example values.

## Risks / Trade-offs

- [Risk] Changing the Hocuspocus URL default could break existing dev setups that rely on `ws://localhost:3334` -> Mitigation: default value matches the current Hocuspocus server path; document in `.env.example`
- [Risk] Removing `ora` could break an import we missed -> Mitigation: grep for all `ora` imports in CLI before removing
- [Risk] Toast errors may be less noticeable than `alert()` for critical actions -> Mitigation: use `variant: "destructive"` for error toasts so they stand out visually
