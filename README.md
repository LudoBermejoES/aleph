# Aleph

Aleph is a modern, self-hosted TTRPG campaign management suite built with Nuxt 4, SQLite, Drizzle ORM, and Tailwind CSS. It provides a robust foundation for managing campaigns, entities, maps, and collaborative play, with a focus on extensibility and developer experience.

## Features

- **Campaign Management:** Create and organize TTRPG campaigns with rich metadata.
- **Entity System:** Visualize and manage campaign entities and their relationships.
- **Genealogies:** Track character family trees with parent, child, spouse, and sibling links. Visualize ancestry on an interactive canvas.
- **Markdown Content:** Write and render campaign notes and handouts in Markdown.
- **Dice Roller:** Built-in dice roller with advanced formula support.
- **Permission Controls:** Fine-grained visibility and role-based permissions.
- **Modern UI:** Responsive, accessible interface using Tailwind CSS and shadcn-vue.
- **Self-Hosting:** Deployable via Docker and docker-compose for easy hosting.

## Tech Stack

- **Nuxt 4** (Vue 3, file-based routing, layouts, composables)
- **SQLite** with Drizzle ORM for migrations and queries
- **Tailwind CSS 4** and shadcn-vue for UI components
- **Vitest** and Playwright for unit, integration, and E2E testing
- **Docker** for containerized deployment

## Directory Structure

```
aleph/
  app/            # Nuxt app: components, pages, layouts, assets
  server/         # API routes, DB, middleware, utilities
  content/        # Markdown campaign files (runtime)
  data/           # SQLite DB file (runtime)
  public/         # Static assets
  tests/          # Unit, integration, and E2E tests
  openspec/       # OpenSpec AI workflow integration
  Dockerfile
  docker-compose.yml
  nuxt.config.ts
  package.json
```

## Getting Started

### Prerequisites

- **Node.js 20.19.0+**
- **npm** (or pnpm/yarn)
- **Docker** (optional, for containerized deployment)

### Local Development

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

### Running with Docker

```bash
docker-compose up --build
```

### Database Migrations

```bash
npm run db:generate
npm run db:migrate
```

### Testing

- Unit/Integration: `npm run test`
- E2E: `npm run test:e2e`

## Deployment

- Production build: `npm run build`
- Start server: `npm run start` or use Docker

## Genealogies

Characters can have demographic fields and family links to build searchable family trees.

### Demographic Fields

Set `birthYear`, `deathYear`, and `gender` on a character via the edit form or the CLI:

```bash
aleph character update <slug> --campaign <id> --birth-year 1200 --death-year 1265 --gender female
```

### Family Links

Add parent/child/spouse/sibling relationships between characters:

```bash
# Zen is a parent of Agnus
aleph character family-add <zen-slug> --campaign <id> --type parent --target <agnus-slug>

# Remove a link by relation ID
aleph character family-remove <slug> --campaign <id> <relationId> --yes
```

Link types `spouse` and `sibling` are stored as a single symmetric row regardless of which character you call the command on.

### Viewing the Family Tree

From the character detail page, click **View Genealogy** to open an interactive tldraw canvas showing the character's ancestors, descendants, and spouse pairs. The layout is computed server-side (layered Walker algorithm) and cached in localStorage.

Click **Recompute Layout** to re-fetch the server-computed coordinates and overwrite any manual repositioning.

The CLI can also render a text tree:

```bash
aleph character genealogy <slug> --campaign <id> --depth 3
aleph character genealogy <slug> --campaign <id> --format json
```

## Contributing

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Open a pull request

## License

MIT
