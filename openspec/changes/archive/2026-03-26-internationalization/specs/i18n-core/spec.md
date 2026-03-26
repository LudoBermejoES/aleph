# Spec: i18n Core

## Purpose

Translation infrastructure for Aleph — locale configuration, language detection, switching, and the translation key system that all UI components depend on.

## ADDED Requirements

### Requirement: Locale Configuration

The app MUST support at least two locales: `en` (English, default) and `es` (Spanish).

#### Scenario: Default locale on first visit
- GIVEN a user visits Aleph for the first time
- WHEN no locale preference is stored
- THEN the app renders in English

#### Scenario: Locale persistence
- GIVEN a user switches to Spanish
- WHEN they navigate to another page or reload
- THEN the app remains in Spanish

### Requirement: Language Switcher

The app MUST provide a UI control to switch between supported locales.

#### Scenario: Switching language
- GIVEN a user is on any page
- WHEN they select a different language from the switcher
- THEN all UI strings on the page update immediately without a full reload

#### Scenario: Switcher visibility
- GIVEN a user is logged in
- WHEN they view the app layout
- THEN the language switcher is visible in the navigation

### Requirement: Missing Translation Fallback

The app MUST fall back to English if a translation key is missing in the active locale.

#### Scenario: Missing key in Spanish locale
- GIVEN the active locale is Spanish
- WHEN a component renders a key that has no Spanish translation
- THEN the English string is displayed (no raw key shown to the user)
