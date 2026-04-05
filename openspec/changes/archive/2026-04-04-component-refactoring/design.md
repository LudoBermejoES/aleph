## Context

The codebase has grown organically with three files exceeding comfortable size limits. MarkdownEditor.client.vue (522 lines) is the most problematic — it contains raw DOM manipulation for entity mention suggestions that duplicates logic already available in EntitySuggestionList.vue. The characters list page (312 lines) and session detail page (386 lines) have accumulated multiple independent UI panels that should be standalone components.

## Goals / Non-Goals

**Goals:**

- Each extracted component has a single responsibility and a clear prop/emit interface
- MarkdownEditor's entity mention dropdown uses EntitySuggestionList.vue instead of raw DOM
- Parent components become thin orchestrators (~60-80 lines) that compose children
- Zero user-visible behavior changes — same rendering, same interactions, same URLs
- Composables extracted where state + logic form a cohesive unit

**Non-Goals:**

- Redesigning any UI or changing layouts
- Adding new features (filters, toolbar buttons, etc.)
- Changing API contracts or data shapes
- Introducing a component library or design system abstraction layer

## Decisions

### Decision 1: Toolbar as a component, not a composable

**Choice**: Extract `MarkdownEditorToolbar.vue` as a component that receives the editor instance as a prop and calls commands directly.

**Why**: The toolbar is primarily template (50+ lines of buttons). A composable would extract the command functions but leave the massive template in place. A component extracts both. The toolbar receives `editor: Editor | null` and `editorState: EditorState` as props, and emits nothing — it calls `editor.chain().focus()...` directly, which is the standard TipTap pattern.

```vue
<!-- MarkdownEditorToolbar.vue -->
<script setup lang="ts">
import type { Editor } from '@tiptap/core'
defineProps<{
  editor: Editor | null
  editorState: EditorState
  campaignId?: string
}>()
defineEmits<{ 'image-picked': [file: File] }>()
</script>
```

### Decision 2: Replace raw DOM mention dropdown with Vue rendering via TipTap's VueRenderer

**Choice**: Replace the `render()` function in MarkdownEditor (lines 215-297) that manually creates DOM elements with TipTap's `VueRenderer` utility, which mounts EntitySuggestionList.vue as a proper Vue component.

**Why**: EntitySuggestionList.vue already exists with the correct interface (`items`, `command`, `query` props, `onKeyDown` exposed method). The current raw DOM approach duplicates this logic, bypasses Vue reactivity, and produces slightly different styling (e.g., missing `text-accent-foreground` class, missing "No entities found" empty state). Using VueRenderer is TipTap's recommended pattern for Vue 3 and requires ~20 lines instead of 80.

```ts
import { VueRenderer } from '@tiptap/vue-3'
// In suggestion.render():
render: () => {
  let component: VueRenderer | null = null
  let popup: HTMLElement | null = null
  return {
    onStart(props) {
      component = new VueRenderer(EntitySuggestionList, { props, editor: props.editor })
      popup = tippy(...)  // or manual positioning
    },
    onUpdate(props) { component?.updateProps(props) },
    onKeyDown(props) { return component?.ref?.onKeyDown(props.event) },
    onExit() { component?.destroy(); popup?.remove() },
  }
}
```

### Decision 3: Collaboration setup as a composable

**Choice**: Extract `useCollaborationProvider(options)` composable that returns `{ ydoc, provider, extensions }`.

**Why**: The collaboration setup (lines 307-336) is pure logic — create Y.Doc, fetch WS token, create HocuspocusProvider, configure Collaboration + CollaborationCaret extensions. It has no template. A composable cleanly encapsulates this and handles cleanup in `onUnmounted`. The parent just spreads the returned extensions into the TipTap extensions array.

```ts
export function useCollaborationProvider(options: {
  documentName: string
  userName: string
  userColor: string
}) {
  // Returns { extensions: Extension[], cleanup: () => void }
}
```

### Decision 4: Editor state tracking as a composable

**Choice**: Extract `useEditorState(editor)` that returns a reactive `editorState` object, updated on `onUpdate` and `onSelectionUpdate`.

**Why**: The `editorState` reactive object and `updateEditorState()` function (lines 125-147) are self-contained. Extracting them reduces MarkdownEditor and makes the toolbar's dependency explicit.

### Decision 5: Character filters as composable + component pair

**Choice**: Extract `useCharacterFilters(campaignId)` composable for state management and URL sync, plus `CharacterFilterBar.vue` for the template.

**Why**: The character list page has 11 filter refs, URL sync logic, and debounced search — ~90 lines of pure logic that belongs in a composable. The filter bar template (~65 lines) becomes a component. The parent page composes both.

```ts
const { filters, setType, toggleSortDir, onFilterChange, initFromUrl } =
  useCharacterFilters(campaignId)
```

### Decision 6: CharacterListItem as a component

**Choice**: Extract the per-character rendering (lines 124-167) into `CharacterListItem.vue`.

**Why**: Each list item has conditional badges (status, race, class, alignment, companion, location, organization) with color logic. This is a clear unit that can be tested independently and reused if characters appear in other views.

### Decision 7: Session sub-panels as components with prop drilling

**Choice**: Each session panel receives only the data it needs via props and emits events for mutations.

**Why**: Keeps components decoupled from the page's data-fetching strategy. The parent page owns loading and API calls; panels are pure presentation + user interaction.

```vue
<!-- SessionAttendancePanel.vue -->
<script setup lang="ts">
defineProps<{
  attendance: any[]
  canManage: boolean
  myRsvp: string
  rsvpStatuses: { value: string; label: string }[]
}>()
defineEmits<{
  'set-rsvp': [status: string]
  'set-attended': [userId: string, attended: boolean]
}>()
</script>
```

### Decision 8: Backward compatibility via same file paths

**Choice**: Parent components keep their original file paths. New components are created in sub-directories (`app/components/editor/`, `app/components/characters/`, `app/components/sessions/`).

**Why**: No imports need updating outside the refactored files. Nuxt auto-imports components from `app/components/` recursively, so new components are immediately available without explicit imports.
