# Proposal: Collaboration

## Why

Campaign management is inherently collaborative -- DMs and players need to edit content simultaneously without overwriting each other's work. This change replaces the basic markdown textarea with a rich collaborative editor (Tiptap 3 + Y.js) and adds real-time presence and notification features so the campaign feels like a shared living workspace.

## What Changes

- Integrate Tiptap 3 editor with @tiptap/markdown for bidirectional markdown-to-editor serialization
- Add Y.js collaborative editing via Hocuspocus backend for conflict-free real-time co-editing
- Implement real-time cursor awareness (see other editors' cursors and selections)
- Define the save pipeline: Y.js state to Tiptap JSON to markdown to merge frontmatter (gray-matter) to write .md file
- Set up Nitro native WebSocket (CrossWS) for non-collaborative real-time events
- Build presence indicators showing who is online in the campaign
- Implement live notifications for entity changes and session updates

## Scope

### In scope
- Tiptap 3 editor integration replacing markdown textarea
- @tiptap/markdown for lossless round-trip: markdown to Tiptap JSON to markdown
- Hocuspocus server for Y.js document sync
- Cursor awareness (colored cursors with user names)
- Save pipeline: Y.js doc to markdown to frontmatter merge to filesystem
- Nitro WebSocket via CrossWS for presence and notifications
- Presence indicators (online users per campaign)
- Live notifications: entity created/updated/deleted, session status changes

### Out of scope
- Offline editing with sync-on-reconnect (future)
- Commenting/annotation system (future)
- Version history diff viewer (future)

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
