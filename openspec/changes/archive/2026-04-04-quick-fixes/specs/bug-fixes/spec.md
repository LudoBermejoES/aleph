## MODIFIED Requirements

### Requirement: Hocuspocus WebSocket URL is configurable

The MarkdownEditor SHALL connect to the Hocuspocus server using a URL from `useRuntimeConfig().public.hocuspocusUrl` instead of a hardcoded `ws://localhost:3334` string.

#### Scenario: Editor connects using runtime config URL

GIVEN the runtime config `hocuspocusUrl` is set to `wss://aleph.example.com/ws`
WHEN a user opens a page with the MarkdownEditor
THEN the WebSocket connection is established to `wss://aleph.example.com/ws`

#### Scenario: Default URL when no config is set

GIVEN no `NUXT_PUBLIC_HOCUSPOCUS_URL` environment variable is defined
WHEN a user opens a page with the MarkdownEditor
THEN the WebSocket connection uses the default value (e.g. `ws://localhost:3334`)

### Requirement: Graph node click navigates to entity page

Clicking a node in the campaign relationship graph SHALL navigate the user to that entity's detail page.

#### Scenario: User clicks a node in the graph

GIVEN the user is viewing the campaign graph at `/campaigns/:id/graph`
WHEN they click on a node representing an entity
THEN they are navigated to `/campaigns/:id/entities/:entityId`

### Requirement: CLI roll command uses correct auth key

The CLI `roll` command SHALL check `config.apiKey` (not `config.token`) to determine whether to record the roll on the server.

#### Scenario: Roll with valid API key records on server

GIVEN the user has `apiKey` set in `~/.aleph/config.json`
WHEN they run `aleph roll 2d6`
THEN the roll result is sent to the server using the `X-API-Key` header
AND the server records the roll

#### Scenario: Roll without API key rolls locally only

GIVEN the user has no `apiKey` in their config
WHEN they run `aleph roll 2d6`
THEN the roll is performed locally
AND no server request is made

### Requirement: Error feedback uses toast instead of alert()

Pages that currently use `alert()` for error messages SHALL use the project's `useToast()` pattern with `variant: "destructive"` instead.

#### Scenario: Entity detail save fails

GIVEN the user is editing an entity detail page
WHEN the save API call fails
THEN a destructive toast is shown with the error message
AND no browser `alert()` dialog appears

#### Scenario: Relation edit save fails

GIVEN the user is editing a relation
WHEN the save fails
THEN a destructive toast is shown with the error message

#### Scenario: Quest edit save fails

GIVEN the user is editing a quest
WHEN the save fails
THEN a destructive toast is shown with the error message

#### Scenario: Inventory create fails

GIVEN the user is creating an inventory item
WHEN the creation fails
THEN a destructive toast is shown with the error message

#### Scenario: Session-group save or delete fails

GIVEN the user is saving or deleting a session group
WHEN the operation fails
THEN a destructive toast is shown with the error message

### Requirement: 404 page uses i18n keys

The 404 error page SHALL use `$t()` for all user-visible strings instead of hardcoded English text.

#### Scenario: 404 page renders in Spanish

GIVEN the user's locale is set to `es`
WHEN they navigate to a non-existent route
THEN the 404 page displays all text in Spanish using the `error.notFound.*` i18n keys

### Requirement: Auth layout title uses i18n key

The auth layout SHALL use a `$t()` key for the "TTRPG Campaign Manager" heading instead of a hardcoded English string.

#### Scenario: Auth layout renders in Spanish

GIVEN the user's locale is set to `es`
WHEN they view the login or register page
THEN the layout heading is displayed in Spanish using the `auth.appTitle` i18n key

### Requirement: CLI session-group delete requires confirmation

The CLI `session-group delete` command SHALL prompt the user for confirmation before deleting. A `--yes` / `-y` flag SHALL skip the prompt.

#### Scenario: Delete with confirmation

GIVEN the user runs `aleph session-group delete <id>`
WHEN the command executes
THEN a confirmation prompt is shown ("Are you sure? (y/N)")
AND the group is only deleted if the user confirms

#### Scenario: Delete with --yes flag

GIVEN the user runs `aleph session-group delete <id> --yes`
WHEN the command executes
THEN no confirmation prompt is shown
AND the group is deleted immediately

## ADDED Requirements

### Requirement: .env.example documents all environment variables

A `.env.example` file SHALL exist at the project root, listing all required and optional environment variables with comments describing their purpose and example values.

#### Scenario: New developer sets up the project

GIVEN a developer clones the repository
WHEN they look for environment configuration
THEN `.env.example` lists variables such as `NUXT_PUBLIC_HOCUSPOCUS_URL`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NUXT_PUBLIC_BASE_URL` with descriptions

### Requirement: docker-compose.yml includes env_file

The `docker-compose.yml` SHALL include `env_file: .env` so environment variables are loaded automatically from the `.env` file.

#### Scenario: Container starts with env_file

GIVEN a `.env` file exists in the project root
WHEN `docker-compose up` is run
THEN the container loads environment variables from `.env` without needing manual `-e` flags

### Requirement: Unused ora dependency removed from CLI

The `cli/package.json` SHALL NOT list `ora` as a dependency since it is not imported anywhere in the CLI codebase.

#### Scenario: Clean dependency list

GIVEN the CLI `package.json`
WHEN inspected
THEN `ora` does not appear in `dependencies` or `devDependencies`
