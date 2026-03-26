# Design: Markdown Content Engine

## Technical Approach

### File Operations

- **Write**: `gray-matter.stringify(content, frontmatter)` produces the `.md` file
- **Read**: `gray-matter(fileContent)` splits frontmatter from body
- **Validate**: Zod schema validates frontmatter on read/write
- **Hash**: MD5 of file content for change detection

### Rendering Pipeline

```
.md file → gray-matter (split frontmatter/body)
         → remark-directive (parse :::secret fences)
         → remarkStripSecrets(userRole) (remove unauthorized blocks)
         → @nuxtjs/mdc parseMarkdown() (parse to AST with Vue components)
         → <MDCRenderer> (render in browser)
```

### Filesystem Watcher

chokidar v5 watches `content/campaigns/**/*.md` with:
- `awaitWriteFinish: { stabilityThreshold: 500 }` for debouncing
- Batched processing (1s debounce) to handle bulk edits
- Events: add → index new entity, change → re-index, unlink → remove from DB

### FTS5 Index

- Created via raw SQL in migrations (Drizzle lacks FTS5 support)
- Shadow content table `entities_fts_content` with triggers for sync
- Re-index on file change (detected by content_hash mismatch)
- BM25 ranking with weighted fields: name (10x), aliases (8x), tags (2x), body (1x)

### Secret Block Filtering

Custom remark plugin using `remark-directive`:

```markdown
:::secret dm
Only the DM sees this.
:::

:::secret player:alice,bob
Only Alice and Bob see this.
:::
```

Server-side AST manipulation removes nodes before rendering. Content never reaches unauthorized clients.
