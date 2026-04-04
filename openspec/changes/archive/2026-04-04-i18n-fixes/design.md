## Context

The initial internationalization change (2026-03-26) set up `@nuxtjs/i18n`, created `en.json`/`es.json` locale files, and migrated the majority of UI strings. However, several categories of hardcoded English text were missed:

1. **Breadcrumb "Campaign" link** — present in 49 campaign sub-pages as `>Campaign</NuxtLink>`
2. **404 page** (`app/pages/[...slug].vue`) — "Page not found", "Back to Campaigns"
3. **Auth layout** (`app/layouts/auth.vue`) — "TTRPG Campaign Manager" tagline
4. **MarkdownEditor** (`app/components/MarkdownEditor.client.vue`) — draft restore banner text ("You have unsaved changes from a previous session", "Restore draft", "Discard") and toolbar button labels/tooltips ("Bold", "Italic", "Strikethrough", "Undo", "Redo", "Bullet List", "Ordered List", "Task List", "Blockquote", "Code Block", "Horizontal Rule", "Insert Link", "Insert Table", "Insert Image", heading labels)

## Goals

- Eliminate all remaining hardcoded English strings in Vue templates
- Add proper en/es translations for every new key
- Maintain consistency with the existing key namespace structure in `en.json`/`es.json`

## Non-Goals

- Server-side API error messages (remain in English by design)
- Adding new languages beyond en/es
- Refactoring breadcrumb markup into a shared component (separate concern; this change only swaps the text)
- Toolbar accessibility labels or ARIA attributes (separate concern)

## Decisions

1. **New key namespaces**: Add keys under `common` (breadcrumb "Campaign"), `errors` (404 page text), `auth` (tagline), and a new `editor` namespace for MarkdownEditor strings. The `editor` namespace groups draft-banner and toolbar strings together since they belong to a single component.

2. **Breadcrumb approach**: Replace the hardcoded `>Campaign</NuxtLink>` text with `>{{ $t('common.campaign') }}</NuxtLink>` in all 49 files. A shared breadcrumb component would be cleaner but is out of scope — this change is strictly about i18n completeness.

3. **Toolbar labels**: The toolbar buttons use mixed content (emoji + English text like "🔗 Link"). Replace only the English text portion with `$t()` calls, keeping the emoji prefix as-is since emojis are language-neutral.

4. **Toolbar tooltips**: The `title` attributes contain English text like `title="Bold (Ctrl+B)"`. Replace with `$t()` calls. Keyboard shortcut hints are kept since they are universal.

## Risks

- **Large diff across many files** — the breadcrumb change touches 49 pages, but each change is a single-line mechanical replacement, making review straightforward.
- **Missing a string** — mitigated by a verification task that greps for remaining hardcoded English patterns.
