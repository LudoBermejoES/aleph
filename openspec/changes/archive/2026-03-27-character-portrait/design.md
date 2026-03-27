## Context

The project has a general-purpose image upload endpoint (`POST /api/campaigns/[id]/images`) and a map-specific upload (`POST /api/campaigns/[id]/maps/[slug]/upload`). Neither is tied to a character. The `characters` table has no image column. The existing pattern stores files on disk under `campaign.contentDir/` and returns a relative API URL.

## Goals / Non-Goals

**Goals:** Add a per-character portrait — upload, store, serve, and display it. Wire it into the character detail page and list. Add CLI support to upload a portrait from a local file.

**Non-Goals:** Image resizing, thumbnailing, or CDN delivery. Multiple portraits per character. Using the generic `/images` endpoint for portrait association (we want an explicit, discoverable portrait per character).

## Decisions

**Dedicated portrait endpoints over reusing `/images`** — `POST /api/campaigns/[id]/characters/[slug]/portrait` makes the portrait a first-class property of the character, not an opaque uploaded file. The URL is stable and predictable. The generic `/images` endpoint stays for editor-embedded images.

**`portraitUrl` column on `characters` table** — stores the API path (e.g., `/api/campaigns/<id>/characters/<slug>/portrait`). Nullable — no portrait = null. Simple to query, no join needed.

**File stored at `content/<campaignId>/characters/<slug>/portrait.<ext>`** — mirrors the map pattern. One file per character; new upload overwrites the previous one. No orphan cleanup needed.

**Serve portrait via dedicated GET endpoint** — reads the file from disk and streams it with correct Content-Type. This keeps file storage behind the auth-aware API layer (respects campaign visibility rules).

**CLI uses multipart POST** — `client.js` already has `post()`. We add a `postMultipart(path, filePath)` helper using `form-data` (already a transitive dep via npm). The new `character upload-portrait` subcommand calls it.

**Reusable `CharacterPortrait.vue` component** — renders the portrait image if present, or a placeholder silhouette. Accepts `portraitUrl`, `name`, `editable` props. The upload interaction (file picker → POST → refresh) lives here.

## Risks / Trade-offs

[Low] Overwriting a portrait deletes the old file on disk — no undo. Acceptable for now; the previous portrait URL becomes a 404 if cached anywhere.

[Low] No image resizing — large portraits load at full resolution. Acceptable since maps have the same behavior and the 10 MB limit is enforced.

[Low] `form-data` package version compatibility with Node 22 — mitigated by checking the existing dep tree; `node-fetch` / npm already pulls it in, or we use the native `FormData` (Node 18+).
