# i18n Completeness

All user-visible strings in pages, layouts, and components use `$t()` translation keys. No hardcoded English text remains in Vue templates.

## MODIFIED Requirements

### Requirement: 404 Page Translated

The 404 catch-all page SHALL display translated text for the heading, description, and navigation link.

#### Scenario: User visits non-existent route in Spanish locale

- **Given** the locale is set to "es"
- **When** the user navigates to a non-existent route
- **Then** the page displays the Spanish translation for "Page not found"
- **And** the page displays the Spanish translation for "Back to Campaigns"

#### Scenario: User visits non-existent route in English locale

- **Given** the locale is set to "en"
- **When** the user navigates to a non-existent route
- **Then** the page displays "Page not found"
- **And** the page displays "Back to Campaigns"

### Requirement: Auth Layout Tagline Translated

The auth layout (login/register pages) SHALL show a translated tagline below the logo.

#### Scenario: Auth page renders in Spanish

- **Given** the locale is set to "es"
- **When** the user visits the login page
- **Then** the tagline below the logo displays the Spanish translation of "TTRPG Campaign Manager"

### Requirement: Breadcrumb Campaign Label Translated

Every campaign sub-page breadcrumb that links back to the campaign dashboard SHALL use a translated label.

#### Scenario: Breadcrumb on entities page in Spanish

- **Given** the locale is set to "es"
- **And** the user is viewing the entities list for a campaign
- **Then** the first breadcrumb link displays the Spanish word for "Campaign"

#### Scenario: Breadcrumb on sessions page in English

- **Given** the locale is set to "en"
- **And** the user is viewing the sessions list for a campaign
- **Then** the first breadcrumb link displays "Campaign"

#### Scenario: Breadcrumb consistency across all sub-pages

- **Given** any campaign sub-page under `campaigns/[id]/`
- **When** the page renders
- **Then** the breadcrumb "Campaign" link text comes from `$t('common.campaign')`, not a hardcoded string

### Requirement: MarkdownEditor Draft Banner Translated

The draft-restore banner in the MarkdownEditor SHALL show translated text for the message and action buttons.

#### Scenario: Draft banner in Spanish

- **Given** the locale is set to "es"
- **And** the MarkdownEditor has a saved draft from a previous session
- **When** the editor renders
- **Then** the banner displays the Spanish translation of "You have unsaved changes from a previous session."
- **And** the "Restore draft" button displays its Spanish translation
- **And** the "Discard" button displays its Spanish translation

### Requirement: MarkdownEditor Toolbar Labels Translated

All toolbar button labels and tooltip texts in the MarkdownEditor SHALL use translation keys.

#### Scenario: Toolbar buttons in Spanish

- **Given** the locale is set to "es"
- **When** the MarkdownEditor renders its toolbar
- **Then** each button's visible text label is in Spanish
- **And** each button's `title` tooltip attribute is in Spanish

#### Scenario: Toolbar buttons in English

- **Given** the locale is set to "en"
- **When** the MarkdownEditor renders its toolbar
- **Then** button labels display: "List", "Tasks", "Quote", "Block", "HR", "Link", "Table", "Image"
- **And** tooltip titles display: "Undo (Ctrl+Z)", "Redo (Ctrl+Shift+Z)", "Bold (Ctrl+B)", "Italic (Ctrl+I)", "Strikethrough", "Inline Code", "Heading 1/2/3", "Bullet List", "Ordered List", "Task List", "Blockquote", "Code Block", "Horizontal Rule", "Insert Link", "Insert Table", "Insert Image"

### Requirement: No Hardcoded English Remains

After all changes, a grep for common hardcoded patterns SHALL find zero matches in Vue template sections.

#### Scenario: Verification grep

- **Given** all i18n fixes have been applied
- **When** running a search for `>Campaign</NuxtLink>` across `app/pages/`
- **Then** zero matches are found
- **When** running a search for hardcoded strings "Page not found", "Back to Campaigns", "TTRPG Campaign Manager", "unsaved changes" across `app/`
- **Then** zero matches are found in Vue template sections

### Requirement: Locale Files Complete

Both `en.json` and `es.json` SHALL contain all new keys with non-empty values.

#### Scenario: Key parity between locales

- **Given** the new keys added to `en.json`
- **Then** `es.json` contains the same key paths
- **And** no value in `es.json` is empty or identical to the English value (unless the word is the same in both languages)
