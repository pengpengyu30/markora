import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
  it('renders the remaining top navigation without removed groups', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.getByText('All Notes')).toBeInTheDocument()
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

  it('selects a top navigation filter', () => {
    const onSelect = vi.fn()
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('All Notes'))

    expect(onSelect).toHaveBeenCalledWith({ kind: 'filter', filter: 'all' })
  })

  it('counts all visible notes without a separate archive count', () => {
    const entries = [makeEntry(), makeEntry({ path: '/vault/archive.md', filename: 'archive.md', archived: true })]

    render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})
