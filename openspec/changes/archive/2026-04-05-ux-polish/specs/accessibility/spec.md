## MODIFIED Requirements

### Requirement: MarkdownEditor toolbar buttons have accessible names

Every toolbar button in the MarkdownEditor SHALL have an `aria-label` attribute describing the action (e.g., "Bold", "Italic", "Insert link"). The labels SHALL use i18n keys so they are available in all supported locales.

#### Scenario: Screen reader announces toolbar button purpose

GIVEN a screen reader user focuses on a MarkdownEditor toolbar button that displays a Unicode character (e.g., "B" for bold)
WHEN the button receives focus
THEN the screen reader announces the action name (e.g., "Bold") via the aria-label
AND the aria-label text is localized to the user's locale

#### Scenario: All toolbar buttons have aria-labels

GIVEN the MarkdownEditor component is rendered
WHEN a developer inspects the toolbar buttons
THEN every button element has a non-empty `aria-label` attribute

### Requirement: MarkdownEditor link insertion uses accessible dialog

The MarkdownEditor SHALL use a proper dialog component (shadcn-vue Dialog) for URL input instead of the browser `prompt()` function.

#### Scenario: User inserts a link via accessible dialog

GIVEN the user clicks the "Insert link" toolbar button in the MarkdownEditor
WHEN the action triggers
THEN a Dialog opens with a labelled text input for the URL
AND the dialog has a Cancel button and an Insert button
AND focus is moved into the dialog automatically

#### Scenario: Link dialog is keyboard-operable

GIVEN the link insertion dialog is open
WHEN the user presses Escape
THEN the dialog closes without inserting a link
AND focus returns to the toolbar button that opened it

#### Scenario: Link dialog submits on Enter

GIVEN the link insertion dialog is open and the user has typed a URL
WHEN the user presses Enter
THEN the link is inserted into the editor with the entered URL
AND the dialog closes

### Requirement: Session-groups modal uses proper Dialog component

The session-groups create/edit modal SHALL use the shadcn-vue `Dialog` component instead of a hand-rolled `div.fixed.inset-0` overlay. The dialog SHALL have `role="dialog"`, `aria-modal="true"`, focus trapping, and Escape key dismissal.

#### Scenario: Session-group modal traps focus

GIVEN the user opens the session-group create/edit modal
WHEN they press Tab repeatedly
THEN focus cycles through the interactive elements inside the dialog
AND focus does NOT escape to elements behind the overlay

#### Scenario: Session-group modal closes on Escape

GIVEN the session-group create/edit modal is open
WHEN the user presses Escape
THEN the modal closes
AND focus returns to the button that opened it

#### Scenario: Session-group modal has ARIA attributes

GIVEN the session-group create/edit modal is open
WHEN a developer inspects the DOM
THEN the modal container has `role="dialog"` and `aria-modal="true"`
AND the modal has an `aria-labelledby` pointing to the heading element

### Requirement: DiceRoller buttons have accessible names

DiceRoller buttons (e.g., "d4", "d6", "d8", "d10", "d12", "d20") SHALL have `aria-label` attributes that describe the action (e.g., "Roll d20"). The labels SHALL use i18n keys.

#### Scenario: Screen reader announces dice button purpose

GIVEN a screen reader user focuses on the "d20" button in the DiceRoller
WHEN the button receives focus
THEN the screen reader announces "Roll d20" (or localized equivalent)

#### Scenario: All dice buttons have aria-labels

GIVEN the DiceRoller component is rendered
WHEN a developer inspects the dice buttons
THEN every dice button has a non-empty `aria-label` attribute

### Requirement: Select elements have associated labels

Every `<select>` element in the application SHALL have an associated `<label>` element (via `for`/`id` pairing) or an `aria-label` attribute. This applies to all filter selects, form selects, and inline selects.

#### Scenario: Entity type filter select has a label

GIVEN the user is on the entity list page
WHEN a screen reader encounters the entity type filter `<select>`
THEN the select is announced with a descriptive label (e.g., "Filter by type")

#### Scenario: Character status filter select has a label

GIVEN the user is on the character list page
WHEN a screen reader encounters the status filter `<select>`
THEN the select is announced with a descriptive label (e.g., "Filter by status")

#### Scenario: Inventory owner type select has a label

GIVEN the user is on the inventory list page
WHEN a screen reader encounters the owner type `<select>`
THEN the select is announced with a descriptive label

#### Scenario: Session status select has a label

GIVEN the user is on a session detail page
WHEN a screen reader encounters the session status `<select>`
THEN the select is announced with a descriptive label (e.g., "Session status")

#### Scenario: Member role select has a label

GIVEN the user is on the members page
WHEN a screen reader encounters the role `<select>` elements
THEN each select is announced with a descriptive label

#### Scenario: Location character/organization select has a label

GIVEN the user is on a location detail page
WHEN a screen reader encounters the character or organization `<select>`
THEN each select is announced with a descriptive label

### Requirement: Character filter bar is keyboard-navigable

The character list filter bar SHALL be navigable via keyboard. Filter controls SHALL be grouped with `role="toolbar"` and labelled with an accessible name. Users SHALL be able to Tab into the toolbar and use standard keyboard interactions to operate each filter.

#### Scenario: User tabs into filter toolbar

GIVEN the user is on the character list page
WHEN they press Tab to reach the filter bar
THEN focus enters the toolbar on the first interactive filter control
AND the toolbar is announced as a group (e.g., "Character filters")

#### Scenario: User operates select filter via keyboard

GIVEN focus is on a select filter within the character filter bar
WHEN the user presses Space or Enter
THEN the select opens its options
AND the user can navigate options with arrow keys

### Requirement: SearchCommand uses proper ARIA semantics

The SearchCommand component SHALL have correct ARIA attributes: `aria-label` on the command input, `role="option"` on result items, and proper `aria-expanded`/`aria-activedescendant` management.

#### Scenario: Search input has accessible name

GIVEN the SearchCommand is open
WHEN a screen reader encounters the search input
THEN the input is announced with a descriptive label (e.g., "Search campaigns, entities, and commands")

#### Scenario: Search results are announced

GIVEN the user has typed a query in SearchCommand
WHEN results appear
THEN the results container has `role="listbox"`
AND each result item has `role="option"`
AND the currently highlighted result is indicated via `aria-activedescendant` or `aria-selected`
