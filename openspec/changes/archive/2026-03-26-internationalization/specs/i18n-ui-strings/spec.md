# Spec: i18n UI Strings

## Purpose

All user-facing strings in pages and components MUST be sourced from locale files rather than hardcoded in templates. This covers labels, button text, placeholders, empty states, error messages, and status indicators.

## ADDED Requirements

### Requirement: No Hardcoded UI Strings

Every user-visible string rendered by Vue components MUST use a translation key via `$t()` or `useI18n().t()`.

#### Scenario: Translated label
- GIVEN the active locale is Spanish
- WHEN a user views the Characters page
- THEN all labels, buttons, headings, and messages appear in Spanish

#### Scenario: No raw keys exposed
- GIVEN any locale is active
- WHEN a page renders
- THEN no raw translation keys (e.g., `characters.title`) are visible to the user

### Requirement: Complete English and Spanish Locale Files

The `en.json` and `es.json` locale files MUST contain translations for all UI strings used in the app.

#### Scenario: Full coverage
- GIVEN the app is built
- WHEN all locale files are checked
- THEN every key referenced by a `$t()` call exists in `en.json`
- AND every key in `en.json` has a corresponding entry in `es.json`

### Requirement: Dynamic Content Not Translated

Data that comes from the database (campaign names, character names, entity content, etc.) MUST NOT be passed through the translation system.

#### Scenario: Campaign name display
- GIVEN a campaign named "La Maldición de Strahd"
- WHEN displayed in the campaign list
- THEN the name is shown as-is regardless of active locale
