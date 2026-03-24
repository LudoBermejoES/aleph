# Design: Project Setup

## Technical Approach

### Directory Structure

```
aleph/
  app/
    assets/            # Tailwind CSS entry
    components/        # Vue components
      ui/              # shadcn-vue components
    composables/       # Vue composables
    layouts/           # Nuxt layouts
    pages/             # Nuxt pages (file-based routing)
    plugins/           # Nuxt plugins
    app.vue            # Root component
  server/
    api/               # Nitro API routes
    db/
      index.ts         # Database connection
      schema/          # Drizzle schema files per domain
      migrations/      # SQL migration files
    middleware/         # Server middleware
    utils/             # Server utilities
  content/             # Campaign markdown files (created at runtime)
  data/                # SQLite database file (created at runtime)
  public/              # Static assets
  tests/
    unit/
      server/            # API route & service unit tests (`:memory:` SQLite)
      components/        # Vue component tests (mountSuspended)
    integration/         # Full server tests (setup() + $fetch)
    e2e/                 # Playwright browser tests
    helpers/
      db.ts              # Test DB factory (`:memory:` SQLite + schema)
      content.ts         # Temp directory factory for .md file tests
  nuxt.config.ts
  vitest.config.ts
  playwright.config.ts
  drizzle.config.ts
  tailwind.config.ts
  Dockerfile
  docker-compose.yml
```

### Testing Strategy (TDD)

**Three test layers:**

| Layer | Tool | Speed | DB | Files | When to use |
| ----- | ---- | ----- | -- | ----- | ----------- |
| **Unit** | Vitest | Fast (~ms) | `:memory:` SQLite | Temp dirs | Every service, handler, composable |
| **Integration** | @nuxt/test-utils `setup()` + `$fetch` | Medium (~s) | `:memory:` SQLite via runtimeConfig | Temp dirs | API contract verification |
| **E2E** | Playwright | Slow (~10s) | Temp .db file | Temp content dir | Critical user flows only |

**Design for testability:**

- `server/utils/db.ts` exports a `useDb()` function with DI: accepts db instance, defaults to production singleton
- Content service accepts a configurable `rootDir` -- production uses `content/`, tests use temp dirs
- All server services are pure functions that take dependencies as arguments (no module-level singletons)

**TDD cycle:** Write unit tests first (`:memory:` SQLite, temp dirs), run with `vitest --watch`. Integration tests verify API contracts. E2E for critical flows only.

### Key Configuration

- **Nuxt 4.4+** with `compatibilityDate: '2025-07-15'`
- **SQLite**: better-sqlite3 as Drizzle driver (bridge until drizzle-orm/node-sqlite ships)
- **Drizzle**: `drizzle-kit generate` for migrations, `migrate()` on server startup
- **Tailwind CSS 4** + shadcn-vue for component library
- **Nitro**: WebSocket experimental enabled
- **Docker**: Single-stage Node.js image, volume mounts for `data/` and `content/`
