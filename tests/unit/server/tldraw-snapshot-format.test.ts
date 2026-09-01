/**
 * `diagram_snapshots.snapshot` has held three incompatible shapes across this codebase's history
 * (see the module's own header comment for the full account). Each table case here is one of the
 * REAL shapes measured or produced by this codebase's own writers — not an invented format:
 *
 * - `TLStoreSnapshot`  — `toTldrawSnapshot()`'s own generation-time output shape.
 * - `TLEditorSnapshot` — captured from what `TldrawWrapper.tsx`'s `getSnapshot(editor.store)`
 *                         actually sends over REST autosave (`{document:{schema,store},session}`).
 * - `RoomSnapshot`     — captured verbatim (field names, nesting) from a real
 *                         `TLSocketRoom.getCurrentSnapshot()` response, measured against a live
 *                         dev server pushing one shape over the real sync websocket
 *                         (`openspec/changes/normalize-diagram-rest-snapshot-format/design.md`,
 *                         D1).
 *
 * Each case asserts the RULE — the specific record that was written is recoverable by id from
 * `.store`, with its exact `props` intact — not merely that the function returns non-null.
 */
import { describe, it, expect } from 'vitest'
import { normalizeStoredSnapshot } from '../../../server/utils/tldraw-snapshot-format'

const SHAPE = {
  id: 'shape:probe-npc-1',
  typeName: 'shape',
  type: 'npcToken',
  x: 100,
  y: 100,
  rotation: 0,
  isLocked: false,
  opacity: 1,
  meta: {},
  parentId: 'page:page',
  index: 'a1',
  props: {
    w: 140,
    h: 140,
    entityId: 'ent-1',
    campaignId: 'camp-1',
    characterName: 'Probe NPC',
    slug: 'probe-npc',
  },
}

const PAGE_RECORD = { id: 'page:page', typeName: 'page', name: 'Page 1', index: 'a1', meta: {} }
const DOCUMENT_RECORD = {
  id: 'document:document',
  typeName: 'document',
  gridSize: 10,
  name: '',
  meta: {},
}
const SCHEMA = { schemaVersion: 2, sequences: { 'com.tldraw.shape': 4 } }

describe('normalizeStoredSnapshot — the rule: any known persisted shape yields {schema, store} with the original records recoverable by id', () => {
  it('TLStoreSnapshot ({schema, store}) — the generation-time shape — passes through unchanged', () => {
    const raw = {
      schema: SCHEMA,
      store: {
        'document:document': DOCUMENT_RECORD,
        'page:page': PAGE_RECORD,
        [SHAPE.id]: SHAPE,
      },
    }

    const result = normalizeStoredSnapshot(raw)

    expect(result).not.toBeNull()
    expect(result!.schema).toEqual(SCHEMA)
    expect(result!.store[SHAPE.id]).toEqual(SHAPE)
    expect(result!.store['page:page']).toEqual(PAGE_RECORD)
  })

  it('TLEditorSnapshot ({document:{schema,store},session}) — the REST autosave shape from getSnapshot(editor.store) — unwraps .document', () => {
    const raw = {
      document: {
        schema: SCHEMA,
        store: {
          'document:document': DOCUMENT_RECORD,
          'page:page': PAGE_RECORD,
          [SHAPE.id]: SHAPE,
        },
      },
      session: { currentPageId: 'page:page' },
    }

    const result = normalizeStoredSnapshot(raw)

    expect(result).not.toBeNull()
    expect(result!.schema).toEqual(SCHEMA)
    expect(result!.store[SHAPE.id]).toEqual(SHAPE)
  })

  it('RoomSnapshot ({documents:[{state,lastChangedClock}],tombstones,schema}) — the real-time sync room persist shape — reconstructs the store map from documents[].state', () => {
    const raw = {
      tombstoneHistoryStartsAtClock: 0,
      documentClock: 1,
      documents: [
        { state: DOCUMENT_RECORD, lastChangedClock: 0 },
        { state: PAGE_RECORD, lastChangedClock: 0 },
        { state: SHAPE, lastChangedClock: 1 },
      ],
      tombstones: {},
      schema: SCHEMA,
    }

    const result = normalizeStoredSnapshot(raw)

    expect(result).not.toBeNull()
    expect(result!.schema).toEqual(SCHEMA)
    expect(result!.store[SHAPE.id]).toEqual(SHAPE)
    expect(result!.store['page:page']).toEqual(PAGE_RECORD)
    expect(result!.store['document:document']).toEqual(DOCUMENT_RECORD)
    // Exactly the three records that were in `documents`, nothing invented, nothing dropped.
    expect(Object.keys(result!.store).sort()).toEqual(
      ['document:document', 'page:page', SHAPE.id].sort(),
    )
  })

  it('a document entry with no usable state.id is skipped rather than corrupting the store with an undefined key', () => {
    const raw = {
      documents: [
        { state: PAGE_RECORD, lastChangedClock: 0 },
        { state: { typeName: 'shape' }, lastChangedClock: 1 }, // no id
      ],
      schema: SCHEMA,
    }

    const result = normalizeStoredSnapshot(raw)

    expect(result).not.toBeNull()
    expect(Object.keys(result!.store)).toEqual(['page:page'])
  })

  it.each([
    ['null', null],
    ['a plain string', 'not a snapshot at all'],
    ['an empty object', {}],
    ['an object with none of the three known keys', { foo: 'bar' }],
    ['a .document with no usable .store', { document: { session: {} } }],
  ])(
    'unrecognized input (%s) returns null so the caller can fall back to its own defense',
    (_label, input) => {
      expect(normalizeStoredSnapshot(input)).toBeNull()
    },
  )
})
