import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '../../..')

// 11.5 — MarkdownEditor toolbar buttons have aria-label
describe('MarkdownEditor toolbar aria-labels (11.5)', () => {
  const source = readFileSync(resolve(root, 'app/components/MarkdownEditor.client.vue'), 'utf-8')

  const toolbarButtons = [
    'aria.markdownEditor.undo',
    'aria.markdownEditor.redo',
    'aria.markdownEditor.bold',
    'aria.markdownEditor.italic',
    'aria.markdownEditor.strikethrough',
    'aria.markdownEditor.inlineCode',
    'aria.markdownEditor.heading1',
    'aria.markdownEditor.heading2',
    'aria.markdownEditor.heading3',
    'aria.markdownEditor.bulletList',
    'aria.markdownEditor.orderedList',
    'aria.markdownEditor.taskList',
    'aria.markdownEditor.blockquote',
    'aria.markdownEditor.codeBlock',
    'aria.markdownEditor.horizontalRule',
    'aria.markdownEditor.insertLink',
    'aria.markdownEditor.insertTable',
    'aria.markdownEditor.insertImage',
  ]

  for (const key of toolbarButtons) {
    it(`has aria-label for ${key}`, () => {
      expect(source).toContain(key)
    })
  }

  it('link dialog replaces prompt() with Dialog component', () => {
    expect(source).not.toContain("prompt('")
    expect(source).toContain('linkDialogOpen')
    expect(source).toContain('confirmLink')
  })

  it('link dialog has labelled input with id', () => {
    expect(source).toContain('linkInputId')
    expect(source).toContain(':for="linkInputId"')
  })
})

// 11.6 — DiceRoller buttons have aria-label
describe('DiceRoller dice buttons aria-labels (11.6)', () => {
  const source = readFileSync(resolve(root, 'app/components/DiceRoller.vue'), 'utf-8')

  it('uses aria-label on quick-roll buttons', () => {
    expect(source).toContain('aria-label')
    expect(source).toContain('aria.diceRoller')
  })
})

// 11.5 extra — character filter toolbar has role="toolbar"
describe('CharacterFilterBar accessibility (9.1)', () => {
  const source = readFileSync(
    resolve(root, 'app/components/characters/CharacterFilterBar.vue'),
    'utf-8',
  )

  it('has role="toolbar"', () => {
    expect(source).toContain('role="toolbar"')
  })

  it('has aria-label on the toolbar', () => {
    expect(source).toContain('aria.forms.characterFilterToolbar')
  })

  it('has aria-label on status filter select', () => {
    expect(source).toContain('aria.filters.characterStatus')
  })
})

// 11.7 — select elements have accessible names
describe('Select elements have aria-labels (11.7)', () => {
  it('entities index: entity type filter has aria-label', () => {
    const source = readFileSync(
      resolve(root, 'app/pages/campaigns/[id]/entities/index.vue'),
      'utf-8',
    )
    expect(source).toContain('aria.filters.entityType')
  })

  it('inventories index: owner type filter selects have aria-labels', () => {
    const source = readFileSync(
      resolve(root, 'app/pages/campaigns/[id]/inventories/index.vue'),
      'utf-8',
    )
    expect(source).toContain('aria.filters.inventoryOwnerType')
    expect(source).toContain('aria.filters.inventoryCreateOwnerType')
  })

  it('sessions detail: status select has aria-label', () => {
    const source = readFileSync(
      resolve(root, 'app/pages/campaigns/[id]/sessions/[slug]/index.vue'),
      'utf-8',
    )
    expect(source).toContain('aria.filters.sessionStatus')
  })

  it('members page: change-role select has aria-label', () => {
    const source = readFileSync(resolve(root, 'app/pages/campaigns/[id]/members.vue'), 'utf-8')
    expect(source).toContain('aria.filters.memberRole')
  })

  it('locations detail: character and organization selects have aria-labels', () => {
    const source = readFileSync(
      resolve(root, 'app/pages/campaigns/[id]/locations/[slug]/index.vue'),
      'utf-8',
    )
    expect(source).toContain('aria.filters.locationCharacter')
    expect(source).toContain('aria.filters.locationOrganization')
  })
})

// Session-groups dialog uses shadcn Dialog
describe('SessionGroups uses shadcn Dialog (4.1-4.2)', () => {
  const source = readFileSync(
    resolve(root, 'app/pages/campaigns/[id]/session-groups/index.vue'),
    'utf-8',
  )

  it('uses Dialog component instead of hand-rolled modal', () => {
    expect(source).toContain('<Dialog')
    expect(source).toContain('<DialogContent>')
    expect(source).toContain('<DialogHeader>')
    expect(source).toContain('<DialogTitle>')
    expect(source).toContain('<DialogFooter>')
  })

  it('does not use the old fixed inset-0 div modal', () => {
    expect(source).not.toContain('class="fixed inset-0 bg-black/50')
  })
})

// LoadingSkeleton is present on detail pages
describe('LoadingSkeleton on detail pages (1.1-1.8)', () => {
  const pages = [
    'app/pages/campaigns/[id]/entities/[slug]/index.vue',
    'app/pages/campaigns/[id]/characters/[slug]/index.vue',
    'app/pages/campaigns/[id]/sessions/[slug]/index.vue',
    'app/pages/campaigns/[id]/maps/[slug]/index.vue',
    'app/pages/campaigns/[id]/calendars/[calendarId]/index.vue',
    'app/pages/campaigns/[id]/timelines/[slug]/index.vue',
    'app/pages/campaigns/[id]/shops/[slug]/index.vue',
    'app/pages/campaigns/[id]/locations/[slug]/index.vue',
  ]

  for (const page of pages) {
    it(`${page.split('/').slice(-3).join('/')} has LoadingSkeleton`, () => {
      const source = readFileSync(resolve(root, page), 'utf-8')
      expect(source).toContain('LoadingSkeleton')
      expect(source).toContain('useLoadingState')
    })
  }
})

// SearchCommand has ARIA attributes
describe('SearchCommand ARIA (10.1-10.2)', () => {
  const source = readFileSync(resolve(root, 'app/components/SearchCommand.vue'), 'utf-8')

  it('search input has aria-label', () => {
    expect(source).toContain(':aria-label=')
  })

  it('results container has role="listbox"', () => {
    expect(source).toContain('role="listbox"')
  })

  it('result items have role="option"', () => {
    expect(source).toContain('role="option"')
  })
})
