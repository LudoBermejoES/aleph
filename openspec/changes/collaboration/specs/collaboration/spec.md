# Delta for Collaboration

## ADDED Requirements

### Requirement: Tiptap Editor Integration

The system SHALL embed Tiptap 3 as the WYSIWYG markdown editor.

#### Scenario: Loading the editor with existing content
- GIVEN a wiki entity with markdown content stored on disk
- WHEN the user opens the entity in edit mode
- THEN Tiptap 3 initializes with the markdown content rendered as rich text
- AND the toolbar provides controls for headings, bold, italic, lists, links, and images

#### Scenario: Saving editor content as markdown
- GIVEN a user editing content in the Tiptap editor
- WHEN they save the document
- THEN the rich text is serialized back to clean markdown
- AND the markdown file on disk is updated
