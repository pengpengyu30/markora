import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NoteList } from './NoteList'
import { LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'
import type { VaultEntry, SidebarSelection } from '../types'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/test/note.md', filename: 'note.md', title: 'Test Note',
    isA: 'Note', aliases: [], belongsTo: [], relatedTo: [],
    status: null, owner: null, cadence: null, archived: false,
    modifiedAt: 1700000000,
    createdAt: null, fileSize: 100, snippet: '', wordCount: 0,
    relationships: {}, icon: null, color: null, order: null,
    sidebarLabel: null, template: null, sort: null,
    outgoingLinks: [], properties: {},
    ...overrides,
  }
}

const noop = vi.fn()

function expectVisibleNoteOrder(expectedTitles: string[]) {
  const expectedTitleSet = new Set(expectedTitles)
  const items = screen.getAllByText((content) => expectedTitleSet.has(content))
  expect(items.map((item) => item.textContent)).toEqual(expectedTitles)
}

function renderNoteList(props: {
  entries: VaultEntry[]
  selection: SidebarSelection
}) {
  return render(
    <NoteList
      entries={props.entries}
      selection={props.selection}
      selectedNote={null}
      onSelectNote={noop}
      onReplaceActiveTab={noop}
      onCreateNote={noop}
    />,
  )
}

beforeEach(() => { localStorageMock.clear() })

describe('useNoteListSort (via NoteList)', () => {
  it('renders notes sorted by modified date by default', () => {
    const entries = [
      makeEntry({ path: '/a.md', title: 'Alpha', modifiedAt: 1000 }),
      makeEntry({ path: '/b.md', title: 'Beta', modifiedAt: 3000 }),
      makeEntry({ path: '/c.md', title: 'Charlie', modifiedAt: 2000 }),
    ]
    renderNoteList({ entries, selection: { kind: 'filter', filter: 'all' } })
    expectVisibleNoteOrder(['Beta', 'Charlie', 'Alpha'])
  })

  it('reads legacy list sort preferences when Tolaria key is absent', () => {
    localStorageMock.setItem(LEGACY_APP_STORAGE_KEYS.sortPreferences, JSON.stringify({ '__list__': { option: 'title', direction: 'asc' } }))
    const entries = [
      makeEntry({ path: '/c.md', title: 'Charlie', modifiedAt: 3000 }),
      makeEntry({ path: '/a.md', title: 'Alpha', modifiedAt: 1000 }),
    ]

    renderNoteList({ entries, selection: { kind: 'filter', filter: 'all' } })
    const items = screen.getAllByText(/Alpha|Charlie/)
    expect(items[0].textContent).toBe('Alpha')
    expect(items[1].textContent).toBe('Charlie')
  })
})
