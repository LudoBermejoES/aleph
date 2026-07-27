# content-visibility Specification

## Purpose

DM-controlled secrecy for campaign content: secret blocks carrying an optional `#id` that a DM can reveal and unreveal with the state persisted and broadcast to connected members over WebSocket, reveal-aware content stripping so players see only revealed blocks, a preview-as-player mode, and DM-only entity notes stored separately from entity content.

## Requirements

### Requirement: Secret block with ID attribute

The system SHALL support an optional `#id` attribute on secret blocks for targeted reveal/unreveal operations.

#### Scenario: DM creates a secret block with an ID

- GIVEN a DM editing an entity's markdown content
- WHEN they write `:::secret{.dm #ambush-plan}\nThe goblins hide behind the waterfall.\n:::`
- THEN the SecretBlock parser extracts role="dm" and id="ambush-plan"
- AND the block is stored in the markdown with both attributes preserved
- AND the block renders in the editor with a visual indicator showing the ID

#### Scenario: Secret block without ID continues to work

- GIVEN existing content with `:::secret{.dm}\nOld secret.\n:::`
- WHEN the content is parsed
- THEN the block has role="dm" and id=null
- AND stripping behavior is identical to the current implementation

#### Scenario: Parsing secret block IDs from markdown

- GIVEN markdown content containing `:::secret{.player:alice #alice-hint}`
- WHEN `stripSecretBlocks` processes the content
- THEN it correctly extracts both the role spec ("player:alice") and the block ID ("alice-hint")

---

### Requirement: Secret block reveal and unreveal

The system SHALL allow DMs to reveal and unreveal individual secret blocks, persisting the reveal state.

#### Scenario: DM reveals a secret block

- GIVEN an entity with a secret block `:::secret{.dm #ambush-plan}`
- AND the user has DM or Co-DM role in the campaign
- WHEN the user sends POST `/api/campaigns/:id/entities/:slug/secrets` with body `{ "blockId": "ambush-plan" }`
- THEN the server creates a row in `secret_reveals` with entity_id, secret_block_id="ambush-plan", revealed_by, revealed_at
- AND returns 200 with `{ "revealed": true, "blockId": "ambush-plan" }`
- AND broadcasts `{ "type": "secret:reveal", "entitySlug": "...", "blockId": "ambush-plan" }` to the campaign WebSocket

#### Scenario: DM unreveals a previously revealed block

- GIVEN a secret block "ambush-plan" that has been revealed
- AND the user has DM or Co-DM role
- WHEN the user sends DELETE `/api/campaigns/:id/entities/:slug/secrets/ambush-plan`
- THEN the server deletes the row from `secret_reveals`
- AND returns 200 with `{ "revealed": false, "blockId": "ambush-plan" }`
- AND broadcasts `{ "type": "secret:unreveal", "entitySlug": "...", "blockId": "ambush-plan" }` to the campaign WebSocket

#### Scenario: Player cannot reveal a secret block

- GIVEN the user has Player role in the campaign
- WHEN the user sends POST `/api/campaigns/:id/entities/:slug/secrets` with body `{ "blockId": "ambush-plan" }`
- THEN the server returns 403 Forbidden

#### Scenario: Unauthenticated user cannot reveal a secret block

- GIVEN no authenticated session or API key
- WHEN the user sends POST `/api/campaigns/:id/entities/:slug/secrets`
- THEN the server returns 401 Unauthorized

#### Scenario: DM lists revealed blocks for an entity

- GIVEN an entity with two revealed blocks ("ambush-plan", "treasure-location") and one unrevealed ("final-boss")
- AND the user has DM role
- WHEN the user sends GET `/api/campaigns/:id/entities/:slug/secrets`
- THEN the server returns 200 with `{ "reveals": [{ "blockId": "ambush-plan", ... }, { "blockId": "treasure-location", ... }] }`

---

### Requirement: Reveal-aware content stripping

The system SHALL include revealed secret blocks in rendered content for players.

#### Scenario: Player sees a revealed secret block

- GIVEN an entity with `:::secret{.dm #ambush-plan}\nGoblins hide here.\n:::`
- AND the block "ambush-plan" has been revealed (row exists in `secret_reveals`)
- WHEN a player requests the rendered entity content
- THEN the content includes "Goblins hide here." without the secret block wrapper
- AND unrevealed dm-only blocks are still stripped

#### Scenario: Player does not see unrevealed secret blocks

- GIVEN an entity with `:::secret{.dm #treasure}\nGold in the chest.\n:::`
- AND the block "treasure" has NOT been revealed
- WHEN a player requests the rendered entity content
- THEN "Gold in the chest." is stripped from the output

#### Scenario: Reveal persists across page reloads

- GIVEN the block "ambush-plan" was revealed during a session
- WHEN a player navigates away and returns to the entity page
- THEN the revealed content is still visible (loaded from `secret_reveals` table, not ephemeral WS state)

---

### Requirement: Preview as player mode

The system SHALL allow DMs to preview entity content as rendered for a specific role.

#### Scenario: DM previews entity as a player

- GIVEN the user has DM role in the campaign
- AND the entity contains both public content and `:::secret{.dm}` blocks
- WHEN the user requests the entity with `?preview_as=player`
- THEN the response content has DM-only secret blocks stripped (as a player would see)
- AND the response includes a `previewMode: true` flag
- AND the DM's actual permissions are unchanged (they can still see edit controls)

#### Scenario: DM previews as visitor

- GIVEN the user has DM role
- AND the entity has visibility "members"
- WHEN the user requests with `?preview_as=visitor`
- THEN the content is rendered as a visitor would see it (respecting both visibility and secret stripping)

#### Scenario: Player cannot use preview_as parameter

- GIVEN the user has Player role
- WHEN the user requests the entity with `?preview_as=dm`
- THEN the server ignores the `preview_as` parameter
- AND returns the content for the player's actual role

#### Scenario: Preview mode respects revealed blocks

- GIVEN a DM previewing as player
- AND block "ambush-plan" has been revealed
- WHEN the entity is rendered in preview mode
- THEN the revealed block content IS visible (players can see it)
- AND unrevealed DM blocks are NOT visible

---

### Requirement: Entity secret notes

The system SHALL support DM-only notes attached to an entity, stored separately from entity content.

#### Scenario: DM reads secret notes for an entity

- GIVEN an entity with secret notes "Remember to add a trap encounter"
- AND the user has DM or Co-DM role
- WHEN the user sends GET `/api/campaigns/:id/entities/:slug/secret-notes`
- THEN the server returns 200 with `{ "content": "Remember to add a trap encounter", "updatedAt": "...", "updatedBy": "..." }`

#### Scenario: DM updates secret notes

- GIVEN the user has DM role
- WHEN the user sends PUT `/api/campaigns/:id/entities/:slug/secret-notes` with `{ "content": "Add trap + update NPC dialogue" }`
- THEN the server upserts the row in `entity_secret_notes`
- AND returns 200 with the updated record

#### Scenario: Player cannot access secret notes

- GIVEN the user has Player role
- WHEN the user sends GET `/api/campaigns/:id/entities/:slug/secret-notes`
- THEN the server returns 403 Forbidden

#### Scenario: Entity without secret notes returns empty

- GIVEN an entity with no secret notes record
- AND the user has DM role
- WHEN the user sends GET `/api/campaigns/:id/entities/:slug/secret-notes`
- THEN the server returns 200 with `{ "content": "", "updatedAt": null, "updatedBy": null }`

---

### Requirement: Progressive reveal via WebSocket

The system SHALL broadcast secret reveal/unreveal events to all connected campaign members in real time.

#### Scenario: Connected player sees reveal in real time

- GIVEN a player is viewing an entity page and connected to the campaign WebSocket
- WHEN the DM reveals block "ambush-plan" for that entity
- THEN the player's client receives a `secret:reveal` WebSocket message
- AND the page re-renders to include the newly revealed content without a full page reload

#### Scenario: Connected player sees unreveal in real time

- GIVEN a player is viewing an entity page with a revealed block
- WHEN the DM unreveals that block
- THEN the player's client receives a `secret:unreveal` message
- AND the content disappears from the page without a full page reload

#### Scenario: Player not viewing the entity ignores the message

- GIVEN a player is connected to the campaign WebSocket but viewing a different entity
- WHEN a `secret:reveal` message arrives for another entity
- THEN the client stores the reveal state but does not trigger a re-render

### Requirement: stripSecretBlocks function

The existing `stripSecretBlocks(content, userRole)` function SHALL accept an optional third parameter for revealed block IDs.

#### Scenario: stripSecretBlocks with revealed IDs

- GIVEN content with `:::secret{.dm #trap}\nSpike trap.\n:::` and `:::secret{.dm #loot}\nGold.\n:::`
- AND revealedBlockIds = ["trap"]
- AND userRole = "player"
- WHEN `stripSecretBlocks(content, "player", new Set(["trap"]))` is called
- THEN the output includes "Spike trap." (revealed, wrapper stripped)
- AND the output does NOT include "Gold." (not revealed, fully stripped)

### Requirement: SecretBlock Tiptap extension

The existing `SecretBlock` Tiptap node SHALL be extended with an `id` attribute.

#### Scenario: SecretBlock node with id attribute

- GIVEN the Tiptap editor loads content with `:::secret{.dm #ambush-plan}`
- WHEN the node is parsed
- THEN `node.attrs.role` equals "dm" and `node.attrs.id` equals "ambush-plan"
- AND when serialized back to markdown, it produces `:::secret{.dm #ambush-plan}`

#### Scenario: SecretBlock HTML rendering includes id

- GIVEN a SecretBlock node with id="ambush-plan"
- WHEN rendered to HTML
- THEN the output is `<div data-secret data-role="dm" data-secret-id="ambush-plan">...</div>`
