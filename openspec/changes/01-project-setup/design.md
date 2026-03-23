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
  nuxt.config.ts
  drizzle.config.ts
  tailwind.config.ts
  Dockerfile
  docker-compose.yml
```

### Key Configuration

- **Nuxt 4.4+** with `compatibilityDate: '2025-07-15'`
- **SQLite**: better-sqlite3 as Drizzle driver (bridge until drizzle-orm/node-sqlite ships)
- **Drizzle**: `drizzle-kit generate` for migrations, `migrate()` on server startup
- **Tailwind CSS 4** + shadcn-vue for component library
- **Nitro**: WebSocket experimental enabled
- **Docker**: Single-stage Node.js image, volume mounts for `data/` and `content/`
