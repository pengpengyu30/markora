import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NoteList } from './NoteList'
import { makeEntry, makeIndexedEntry, mockEntries, renderNoteList } from '../test-utils/noteListTestUtils'
import type { NoteStatus } from '../types'

describe('NoteList status indicators', () => {
  it('does not show an indicator for clean notes', () => {
    const getNoteStatus = () => 'clean' as const
    renderNoteList({ getNoteStatus })

    expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pending-save-indicator')).not.toBeInTheDocument()
  })

  it('does not show indicators when everything is clean', () => {
    renderNoteList({ getNoteStatus: () => 'clean' as const })
    expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pending-save-indicator')).not.toBeInTheDocument()
  })

  it('shows an unsaved indicator while a note has unflushed edits', () => {
    const getNoteStatus = (path: string) => path === mockEntries[0].path ? 'unsaved' as const : 'clean' as const

    renderNoteList({ getNoteStatus })
    expect(screen.getAllByTestId('unsaved-indicator')).toHaveLength(1)
  })

  it('does not show indicators when getNoteStatus is undefined', () => {
    renderNoteList()
    expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pending-save-indicator')).not.toBeInTheDocument()
  })

  it('shows a pending-save indicator while a note is being written', () => {
    const getNoteStatus = (path: string) => path === mockEntries[0].path ? 'pendingSave' as const : 'clean' as const
    renderNoteList({ getNoteStatus })
    expect(screen.getAllByTestId('pending-save-indicator')).toHaveLength(1)
  })

  it('removes the indicator after the transient save state clears', () => {
    const targetPath = mockEntries[0].path
    const getNoteStatus = (noteStatus: NoteStatus) => (path: string) => path === targetPath ? noteStatus : 'clean'
    const { props, rerender } = renderNoteList({ getNoteStatus: getNoteStatus('unsaved') })
    const rerenderWithStatus = (nextStatus: NoteStatus) => {
      rerender(<NoteList {...props} getNoteStatus={getNoteStatus(nextStatus)} />)
    }

    expect(screen.getByTestId('unsaved-indicator')).toBeInTheDocument()
    rerenderWithStatus('pendingSave')
    expect(screen.getByTestId('pending-save-indicator')).toBeInTheDocument()
    rerenderWithStatus('clean')
    expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pending-save-indicator')).not.toBeInTheDocument()
  })
})

describe('NoteList virtualized datasets', () => {
  it('renders 9000 entries without crashing', { timeout: 30000 }, () => {
    const largeDataset = Array.from({ length: 9000 }, (_, index) => makeIndexedEntry(index))
    const { container } = renderNoteList({ entries: largeDataset })
    expect(container.querySelector('[data-testid="virtuoso-mock"]')).toBeInTheDocument()
  })

  it('renders both ends of a large dataset through the Virtuoso mock', () => {
    const largeDataset = Array.from({ length: 500 }, (_, index) => makeIndexedEntry(index))
    renderNoteList({ entries: largeDataset })
    expect(screen.getByText('Note 0')).toBeInTheDocument()
    expect(screen.getByText('Note 499')).toBeInTheDocument()
  })

  it('filters large datasets by search query when a candidate has no title', { timeout: 15000 }, async () => {
    vi.useFakeTimers()
    try {
      const entries = [
        makeIndexedEntry(0, { title: 'Alpha Strategy' }),
        makeIndexedEntry(1, {
          filename: 'missing-title.md',
          path: '/vault/note/missing-title.md',
          snippet: 'A partially migrated note with missing title metadata.',
          title: null as unknown as string,
        }),
        ...Array.from({ length: 298 }, (_, index) => makeIndexedEntry(index + 2, { title: `Filler Note ${index + 1}` })),
        makeIndexedEntry(300, { title: 'Beta Strategy' }),
      ]

      renderNoteList({ entries })
      fireEvent.click(screen.getByTitle('Search notes'))
      fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'Strategy' } })

      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      vi.useRealTimers()

      await waitFor(() => {
        expect(screen.getByText('Alpha Strategy')).toBeInTheDocument()
        expect(screen.getByText('Beta Strategy')).toBeInTheDocument()
        expect(screen.queryByText('Filler Note 1')).not.toBeInTheDocument()
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('sorts large datasets correctly', () => {
    const entries = [
      makeIndexedEntry(0, { title: 'Zebra', modifiedAt: 1000 }),
      makeIndexedEntry(1, { title: 'Alpha', modifiedAt: 3000 }),
      ...Array.from({ length: 100 }, (_, index) => makeIndexedEntry(index + 2, { title: `Mid ${index}`, modifiedAt: 2000 - index })),
    ]

    renderNoteList({ entries })
    expect(screen.getAllByText(/^Alpha$|^Zebra$/)[0].textContent).toBe('Alpha')
  })

  it('re-sorts when an entry modifiedAt changes', () => {
    const entries = [
      makeEntry({ path: '/a.md', title: 'Alpha', modifiedAt: 1000 }),
      makeEntry({ path: '/b.md', title: 'Beta', modifiedAt: 3000 }),
    ]

    const { rerender, props } = renderNoteList({ entries })
    expect(screen.getAllByText(/^Alpha$|^Beta$/)[0].textContent).toBe('Beta')

    rerender(
      <NoteList
        {...props}
        entries={[
          { ...entries[0], modifiedAt: 4000 },
          entries[1],
        ]}
      />,
    )

    expect(screen.getAllByText(/^Alpha$|^Beta$/)[0].textContent).toBe('Alpha')
  })

  it('keeps selection highlighting in virtualized lists', () => {
    const entries = Array.from({ length: 100 }, (_, index) => makeIndexedEntry(index))
    renderNoteList({ entries, selectedNote: entries[5] })
    expect(screen.getByText('Note 5')).toBeInTheDocument()
  })

  it('keeps click behavior working on virtualized items', () => {
    const entries = Array.from({ length: 100 }, (_, index) => makeIndexedEntry(index))
    const { onReplaceActiveTab } = renderNoteList({ entries })
    fireEvent.click(screen.getByText('Note 50'))
    expect(onReplaceActiveTab).toHaveBeenCalledWith(entries[50])
  })
})

describe('NoteList multi-select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function selectTwoNotes(extraProps: Record<string, unknown> = {}) {
    renderNoteList(extraProps)
    fireEvent.click(screen.getByText('Build Laputa App'))
    fireEvent.click(screen.getByText('Facebook Ads Strategy'), { shiftKey: true })
  }

  it('selects a range on Shift+Click', () => {
    selectTwoNotes()
    expect(screen.getAllByTestId('multi-selected-item').length).toBeGreaterThanOrEqual(2)
  })

  it('clears multi-select and opens the note on regular click', () => {
    const { onReplaceActiveTab } = renderNoteList()
    fireEvent.click(screen.getByText('Build Laputa App'))
    fireEvent.click(screen.getByText('Facebook Ads Strategy'), { shiftKey: true })
    fireEvent.click(screen.getByText('Matteo Cellini'))

    expect(screen.queryByTestId('multi-selected-item')).not.toBeInTheDocument()
    expect(onReplaceActiveTab).toHaveBeenCalledWith(mockEntries[2])
  })

  it('shows the bulk action bar with the selected count', () => {
    selectTwoNotes()
    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument()
    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it.each([
    { label: 'deletes via button', prop: 'onBulkDeletePermanently', trigger: () => fireEvent.click(screen.getByTestId('bulk-delete-btn')) },
    { label: 'deletes via Cmd+Backspace', prop: 'onBulkDeletePermanently', trigger: () => fireEvent.keyDown(window, { key: 'Backspace', metaKey: true }) },
    { label: 'deletes via Cmd+Delete', prop: 'onBulkDeletePermanently', trigger: () => fireEvent.keyDown(window, { key: 'Delete', metaKey: true }) },
  ])('bulk-select $label and clears the selection', ({ prop, trigger }) => {
    const handler = vi.fn()
    selectTwoNotes({ [prop]: handler })
    trigger()
    expect(handler).toHaveBeenCalledWith([mockEntries[0].path, mockEntries[1].path])
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument()
  })

  it('clears the selection from the bulk action bar', () => {
    selectTwoNotes()
    fireEvent.click(screen.getByTestId('bulk-clear-btn'))
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('multi-selected-item')).not.toBeInTheDocument()
  })

  it('does not show a bulk action bar when nothing is selected', () => {
    renderNoteList()
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument()
  })
})
