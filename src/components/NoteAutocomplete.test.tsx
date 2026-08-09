import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteAutocomplete } from './NoteAutocomplete'
import type { VaultEntry } from '../types'

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/note/test.md',
  filename: 'test.md',
  title: 'Test Note',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: 'Active',
  owner: null,
  cadence: null,
  archived: false,
  modifiedAt: 1700000000,
  createdAt: 1700000000,
  fileSize: 100,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  ...overrides,
})

const entries = [
  makeEntry({ path: '/vault/project/alpha.md', filename: 'alpha.md', title: 'Alpha Project', isA: 'Project' }),
  makeEntry({ path: '/vault/person/luca.md', filename: 'luca.md', title: 'Luca', isA: 'Person' }),
  makeEntry({ path: '/vault/topic/ai.md', filename: 'ai.md', title: 'AI Research', isA: 'Topic' }),
  makeEntry({ path: '/vault/note/plain.md', filename: 'plain.md', title: 'Plain Note', isA: null }),
  makeEntry({ path: '/vault/person/alice.md', filename: 'alice.md', title: 'Alice Smith', isA: 'Person', aliases: ['Alice'] }),
]

describe('NoteAutocomplete', () => {
  const onChange = vi.fn()
  const onSelect = vi.fn()
  const onEscape = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input with placeholder', () => {
    render(
      <NoteAutocomplete entries={entries} value="" onChange={onChange} onSelect={onSelect} placeholder="Note title" testId="test-input" />,
    )
    expect(screen.getByPlaceholderText('Note title')).toBeInTheDocument()
  })

  it('does not show dropdown for short queries', () => {
    render(
      <NoteAutocomplete entries={entries} value="A" onChange={onChange} onSelect={onSelect} />,
    )
    expect(screen.queryByText('Alpha Project')).not.toBeInTheDocument()
  })

  it('shows matching entries when query is long enough', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="Al" onChange={onChange} onSelect={onSelect} />,
    )
    // Simulate opening the dropdown by focusing and typing
    const input = container.querySelector('input')!
    fireEvent.focus(input)
    expect(screen.getByText('Alpha Project')).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('calls onSelect when clicking a dropdown item', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="Alpha" onChange={onChange} onSelect={onSelect} />,
    )
    fireEvent.focus(container.querySelector('input')!)
    fireEvent.click(screen.getByText('Alpha Project'))
    expect(onSelect).toHaveBeenCalledWith('Alpha Project')
  })

  it('navigates dropdown with arrow keys', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="Al" onChange={onChange} onSelect={onSelect} />,
    )
    const input = container.querySelector('input')!
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // First item should be selected
    const selectedItem = container.querySelector('.wikilink-menu__item--selected')
    expect(selectedItem).toBeTruthy()
  })

  it('selects highlighted item with Enter', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="Al" onChange={onChange} onSelect={onSelect} />,
    )
    const input = container.querySelector('input')!
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('Alpha Project')
  })

  it('calls onEscape when Escape is pressed', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="test" onChange={onChange} onSelect={onSelect} onEscape={onEscape} />,
    )
    const input = container.querySelector('input')!
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onEscape).toHaveBeenCalled()
  })

  it('matches on aliases', () => {
    const { container } = render(
      <NoteAutocomplete entries={entries} value="Alice" onChange={onChange} onSelect={onSelect} />,
    )
    fireEvent.focus(container.querySelector('input')!)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('limits results to MAX_RESULTS', () => {
    const manyEntries = Array.from({ length: 20 }, (_, i) =>
      makeEntry({ path: `/vault/note/${i}.md`, filename: `${i}.md`, title: `Note ${i}`, isA: null }),
    )
    const { container } = render(
      <NoteAutocomplete entries={manyEntries} value="Note" onChange={onChange} onSelect={onSelect} />,
    )
    fireEvent.focus(container.querySelector('input')!)
    const items = container.querySelectorAll('.wikilink-menu__item')
    expect(items.length).toBe(10) // MAX_RESULTS
  })

  it('submits raw value with Enter when no item is selected', () => {
    render(
      <NoteAutocomplete entries={entries} value="custom text" onChange={onChange} onSelect={onSelect} />,
    )
    const input = screen.getByDisplayValue('custom text')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('custom text')
  })
})
