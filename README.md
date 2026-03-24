# Aleph

Aleph is a modern, self-hosted TTRPG campaign management suite built with Nuxt 4, SQLite, Drizzle ORM, and Tailwind CSS. It provides a robust foundation for managing campaigns, entities, maps, and collaborative play, with a focus on extensibility and developer experience.

## Features

- **Campaign Management:** Create and organize TTRPG campaigns with rich metadata.
- **Entity System:** Visualize and manage campaign entities and their relationships.
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

## Contributing

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Open a pull request

## License

MIT
