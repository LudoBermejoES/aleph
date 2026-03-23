# Proposal: Project Setup

## Why

Aleph needs a properly scaffolded Nuxt 4 project with SQLite database, Drizzle ORM migrations, and the foundational directory structure for both the app and campaign content. This is the foundation every other change depends on.

## What Changes

- Scaffold the production Nuxt 4 project (replacing the prototype)
- Configure SQLite via better-sqlite3 with WAL mode
- Set up Drizzle ORM with migration system
- Create initial database migration (users table placeholder, campaigns table)
- Establish the `content/` directory convention for markdown files
- Configure Tailwind CSS + shadcn-vue for UI
- Set up TypeScript configuration
- Configure Nitro server with experimental WebSocket support
- Add ESLint + Prettier
- Create Docker and docker-compose files for self-hosted deployment

## Scope

### In scope
- Nuxt 4 project scaffold with proper directory structure
- SQLite + Drizzle ORM setup with migration tooling
- Tailwind CSS + shadcn-vue installation
- Basic layout shell (sidebar + content area)
- Docker/docker-compose configuration
- Development tooling (ESLint, Prettier, TypeScript)

### Out of scope
- Authentication (change 02)
- Any feature implementation
- Markdown rendering pipeline (change 03)
