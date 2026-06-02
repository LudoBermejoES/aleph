# Aleph documentation

The [top-level README](../README.md) sells the project and gets you running. These docs explain how it actually works — start with the architecture map, then dive into whatever you're touching.

## Start here

- **[architecture.md](architecture.md)** — the system map: SPA + Nitro, the two-store content model, the three transport channels, and where the surprises are. Read this first.

## The hard parts

- **[content-model.md](content-model.md)** — entities as Markdown files _and_ database rows, kept in sync; secret blocks; FTS5 search.
- **[collaboration.md](collaboration.md)** — Hocuspocus + Yjs real-time editing and the Markdown↔Tiptap↔Yjs conversion pipeline.
- **[diagrams.md](diagrams.md)** — running React inside Nuxt for tldraw, custom RPG shapes, and live diagram sync.
- **[autolink.md](autolink.md)** — automatic entity cross-linking with exclusion zones (and the no-nesting rule).
- **[auth.md](auth.md)** — dual cookie-session + API-key auth, the per-campaign role model, and secret blocks.
- **[theming.md](theming.md)** — the ten immersive themes and how `data-theme` + `themes.css` + `@nuxt/fonts` fit together.

## Operating it

- **[development.md](development.md)** — local setup, project layout, the database workflow, testing, and the gotchas (i18n dir, `--legacy-peer-deps`, migration ordering).
- **[deployment.md](deployment.md)** — production build, PM2, Docker, CI/CD, native modules, persistent state.
- **[backup.md](backup.md)** — Cloudflare R2 daily backups and restore.
- **[cli.md](cli.md)** — the `aleph` companion CLI.

## Also in this folder

- `claude-skill.md` — the shareable AI skill describing the CLI's public surface.
- `openspec/` — the spec-driven-development workflow docs.
