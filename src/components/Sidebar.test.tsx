import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sidebar } from './Sidebar'
import type { SidebarSelection, VaultEntry } from '../types'

const defaultSelection: SidebarSelection = { kind: 'filter', filter: 'all' }

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/note.md',
    filename: 'note.md',
    title: 'Note',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    outgoingLinks: [],
    properties: {},
    ...overrides,
  }
}

describe('Sidebar', () => {
  it('does not render the removed all-notes navigation entry', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.queryByText('All Notes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-top-nav')).not.toBeInTheDocument()
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Archive')).not.toBeInTheDocument()
    expect(screen.queryByText('Types')).not.toBeInTheDocument()
    expect(screen.queryByText('Views')).not.toBeInTheDocument()
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
  })

  it('does not render type, view, or favorite entries', () => {
    const favorite = makeEntry({ title: 'Favorite Note', favorite: true, favoriteIndex: 0 })

    render(<Sidebar entries={[favorite]} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.queryByText('Favorite Note')).not.toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
  })

  it('renders registered project roots in the folders section', () => {
    render(
      <Sidebar
        entries={[]}
        folders={[
          { name: 'Edge', path: '', rootPath: '/projects/edge', children: [] },
          { name: 'Tolaria', path: '', rootPath: '/projects/tolaria', children: [] },
        ]}
        selection={defaultSelection}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByText('Edge')).toBeInTheDocument()
    expect(screen.getByText('Tolaria')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('does not show a separate all-notes count', () => {
    const entries = [makeEntry(), makeEntry({ path: '/vault/archive.md', filename: 'archive.md', archived: true })]

    render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })
})
