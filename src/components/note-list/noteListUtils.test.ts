import { describe, it, expect, vi } from 'vitest'
import { createNoteStatusResolver, routeNoteClick } from './noteListUtils'

function makeEntry(path = '/test.md') {
  return {
    path, filename: 'test.md', title: 'Test', isA: null,
    aliases: [], belongsTo: [], relatedTo: [], status: null,
    archived: false,
    modifiedAt: null, createdAt: null, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {},
    icon: null, color: null, order: null, sidebarLabel: null,
    template: null, sort: null, view: null, visible: null,
    outgoingLinks: [], properties: {},
  }
}

function makeActions() {
  return {
    onReplace: vi.fn(),
    multiSelect: {
      selectRange: vi.fn(),
      clear: vi.fn(),
      setAnchor: vi.fn(),
    },
  }
}

function makeMouseEvent(overrides = {}) {
  return { metaKey: false, ctrlKey: false, shiftKey: false, ...overrides }
}

function makeStatusResolver(activeStatus, modifiedFiles) {
  return createNoteStatusResolver(
    () => activeStatus,
    modifiedFiles,
    new Set(modifiedFiles.map((file) => file.path)),
  )
}

describe('routeNoteClick', () => {
  it('plain click replaces active tab', () => {
    const entry = makeEntry()
    const actions = makeActions()
    routeNoteClick(entry, makeMouseEvent(), actions)
    expect(actions.onReplace).toHaveBeenCalledWith(entry)
    expect(actions.multiSelect.clear).toHaveBeenCalled()
    expect(actions.multiSelect.setAnchor).toHaveBeenCalledWith(entry.path)
  })

  it('Shift+click selects range', () => {
    const entry = makeEntry()
    const actions = makeActions()
    routeNoteClick(entry, makeMouseEvent({ shiftKey: true }), actions)
    expect(actions.multiSelect.selectRange).toHaveBeenCalledWith(entry.path)
  })

})

describe('createNoteStatusResolver', () => {
  it('keeps transient note status ahead of repository status', () => {
    const modifiedFiles = [{
      path: '/vault/note.md',
      relativePath: 'note.md',
      status: 'modified',
    }]
    const resolver = makeStatusResolver('unsaved', modifiedFiles)

    expect(resolver('/vault/note.md')).toBe('unsaved')
  })

  it('uses modified files when active-vault status says the note is clean', () => {
    const modifiedFiles = [{
      path: '/other-vault/note.md',
      relativePath: 'note.md',
      status: 'untracked',
      vaultPath: '/other-vault',
    }]
    const resolver = makeStatusResolver('clean', modifiedFiles)

    expect(resolver('/other-vault/note.md')).toBe('new')
  })
})
