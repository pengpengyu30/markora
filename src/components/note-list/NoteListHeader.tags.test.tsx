import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteListHeader } from './NoteListHeader'

const baseProps = {
  title: 'Notes',
  listSort: 'modified' as const,
  listDirection: 'desc' as const,
  searchVisible: false,
  search: '',
  isSearching: false,
  searchInputRef: { current: null },
  locale: 'en' as const,
  onSortChange: vi.fn(),
  onCreateNote: vi.fn(),
  onToggleSearch: vi.fn(),
  onSearchChange: vi.fn(),
  onSearchKeyDown: vi.fn(),
}

describe('NoteListHeader tag filter', () => {
  it('shows the current tag filter and clears it', () => {
    const onClearTagFilter = vi.fn()
    render(
      <NoteListHeader
        {...baseProps}
        selectedTags={['alpha', 'shared']}
        onClearTagFilter={onClearTagFilter}
      />,
    )

    expect(screen.getByTestId('note-list-tag-filter')).toHaveTextContent('alpha')
    expect(screen.getByTestId('note-list-tag-filter')).toHaveTextContent('shared')
    fireEvent.click(screen.getByRole('button', { name: 'Clear tag filter' }))
    expect(onClearTagFilter).toHaveBeenCalledTimes(1)
  })
})
