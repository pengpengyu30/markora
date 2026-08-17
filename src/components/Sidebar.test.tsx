import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })
  })

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

  it('highlights the active project independently from the all-notes selection', () => {
    render(
      <Sidebar
        entries={[]}
        folders={[
          { name: 'Project A', path: '', rootPath: '/projects/a', children: [] },
          { name: 'Project B', path: '', rootPath: '/projects/b', children: [] },
        ]}
        selection={defaultSelection}
        activeProjectPath="/projects/b"
        onSelect={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Project B' })).toHaveAttribute('data-active-project', 'true')
    expect(screen.getByRole('button', { name: 'Project A' })).not.toHaveAttribute('data-active-project')
  })

  it('places Tags above Projects and keeps the group collapsed by default', () => {
    render(
      <Sidebar
        entries={[makeEntry({ properties: { tags: ['shared'] } })]}
        folders={[{ name: 'Edge', path: '', rootPath: '/projects/edge', children: [] }]}
        selection={defaultSelection}
        onSelect={() => {}}
      />,
    )

    const tagsSection = screen.getByTestId('sidebar-tags')
    const projectsLabel = screen.getByText('Projects')
    expect(tagsSection.compareDocumentPosition(projectsLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: /shared.*1/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'TAGS' }))
    expect(screen.getByRole('button', { name: /shared.*1/i })).toBeInTheDocument()
  })

  it('does not show a separate all-notes count', () => {
    const entries = [makeEntry(), makeEntry({ path: '/vault/archive.md', filename: 'archive.md', archived: true })]

    render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.queryByText('2')).not.toBeInTheDocument()
  })
})
