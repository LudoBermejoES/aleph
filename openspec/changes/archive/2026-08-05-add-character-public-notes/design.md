# Design: Character Public Notes

## The decision that shaped everything: one row per author, not one shared column

The requested shape was a single **public field** on the character: one column, every member
edits it, everyone reads the same text. That is the simplest thing that could work, and it has
one fault that is not recoverable at the UI layer:

> Ana writes three paragraphs about an NPC. Luis opens the same character an hour later, is
> served Ana's text, adds a line, and saves. Ana's version is gone. Nobody is told.

This is the classic lost update, and it is worse here than usual because the whole point of the
field is that **several people write in it**. Optimistic locking would only convert silent loss
into a save that fails, which is a worse experience for a note field. Real-time merging
(Hocuspocus, already in the stack) would solve it properly but is a much larger change and is
listed out of scope.

So the storage is **one row per `(characterId, authorUserId)`**, and the _presentation_ is what
was actually asked for: one public notes area on the character, readable by every member, on any
character they can see. Each member edits only their own row, so no write can ever destroy
another member's text. The owner's decision on visibility is preserved exactly — notes are
campaign-member readable — and the concurrency fault disappears rather than being documented.

This is the one deviation from the brief, taken under the owner's explicit "it can be any other
solution if it works".

### What this costs

- A table and a migration instead of one column.
- The character payload carries an array, not a string. Consumers must render N attributed notes
  rather than one blob — which is better anyway, because "who claims this" is exactly what makes
  a table note trustworthy.
- A note cannot be _collectively_ rewritten. If the table wants a single agreed summary, that
  belongs in the character's own `content` and is the DM's or an editor's job. Recorded, not
  solved here.

## Schema

```ts
// server/db/schema/characters.ts
export const characterNotes = sqliteTable(
  'character_notes',
  {
    id: text('id').primaryKey(),
    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('character_notes_char_author').on(table.characterId, table.authorUserId)],
)
```

Decisions inside that:

- **`UNIQUE (characterId, authorUserId)`** is the mechanism, not a nicety: it makes "one note per
  person per character" a database invariant, so a double-submit cannot create two rows for the
  same author. The `PUT` is therefore an upsert on that index.
- **`ON DELETE CASCADE` on both FKs.** Deleting a character takes its notes; deleting a user
  takes theirs. A note whose author no longer exists cannot be attributed, and an unattributed
  note on a character page is a rumour, not a note.
- **Empty body means no note.** Saving `''` deletes the row rather than storing a blank, so the
  character page never renders an empty attributed block.

## Permission model

A new helper sits beside the existing one, deliberately not inside it:

```ts
// server/services/characters.ts
export function canEditCharacter(role, userId, ownerUserId): boolean // unchanged
export function canAnnotateCharacter(role: CampaignRole): boolean {
  return role !== 'visitor'
}
```

- `canEditCharacter` is **not touched**. Widening it would let a note permission leak into the
  character `PUT`, which is the one thing this change must not do.
- **Readability is the gate for writing.** The note routes resolve the character through the same
  visibility path a read uses; if the caller cannot read the character, they get the read's `404`
  and never reach the note logic. There is no separate list of who may annotate what.
- **`visitor` may not annotate.** A visitor is a read-only observer of the campaign; giving the
  most permissive role a write path is the kind of thing that is discovered later by accident.
  `player`, `editor`, `co_dm` and `dm` may.
- **A player annotating their OWN character is allowed.** It costs nothing, and blocking it would
  mean the notes area vanishes from exactly one character for exactly one person, which reads as
  a bug. They also have full edit rights there, so it is redundant, not harmful.

## The "Edit character" flow for a non-owner

The requested behaviour is that clicking **Edit character** no longer dead-ends but opens an
editor with everything hidden except the note field. Two properties matter:

1. **Hidden means absent, not disabled.** A disabled input still ships its value in the DOM and
   invites a devtools bypass. In restricted mode the owner-only fields are not rendered.
2. **The UI is not the security boundary.** Even with a perfectly restricted form, the boundary
   is that the note has its **own endpoint** which accepts only `{ body }`. The character `PUT`
   keeps its `403` untouched. If someone hand-crafts a request, they hit the same wall they hit
   today.

The page decides which mode to show from data it already has: the character's `ownerUserId` and
the caller's `campaignRole`. No new endpoint is needed to answer "may I edit this fully".

## API shape

| Route                               | Who                               | Body               | Notes                                                                  |
| ----------------------------------- | --------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `GET .../characters/:slug`          | anyone who can read the character | —                  | payload gains `notes: [{ authorUserId, authorName, body, updatedAt }]` |
| `GET .../characters/:slug/notes/me` | annotator                         | —                  | the caller's own note, or `null`                                       |
| `PUT .../characters/:slug/notes/me` | annotator                         | `{ body: string }` | upsert; empty body deletes                                             |

`/notes/me` rather than `/notes/:userId` is intentional: there is no route shape that could be
pointed at another user's note, so "edit someone else's note" is not a permission to get wrong.
When DM moderation arrives it gets its own explicit route.

## Deferred, with reasons

- **DM moderation (edit/delete another member's note).** Needed eventually — someone will write
  something that has to go. Deferred because it needs a decision about whether the author is
  told, and that is a product question, not a schema one.
- **Notifying the owner.** Aleph has no notification surface for this yet; inventing one here
  would be the larger half of the change.
- **Hocuspocus collaboration on a note.** Would remove the last trace of the lost-update concern
  for two people editing _the same_ note — but with one row per author, two people never do.
