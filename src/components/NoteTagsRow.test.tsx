import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteTagsPicker, NoteTagsRow } from './NoteTagsRow'

const options = [
  { name: 'shared', count: 3 },
  { name: 'release', count: 1 },
]

describe('NoteTagsRow', () => {
  it('renders tags with fixed-width truncation and exposes the full name on hover', () => {
    render(
      <NoteTagsRow
        tags={['a-very-long-tag-name']}
        locale="en"
        onRemoveTag={vi.fn()}
      />,
    )

    expect(screen.getByText('a-very-long-tag-name')).toHaveAttribute('title', 'a-very-long-tag-name')
    expect(screen.getByTestId('note-tag-chip')).toHaveClass('max-w-28')
  })

  it('renders tags, removes a chip, and creates a lowercase typed tag from the icon picker', () => {
    const onAddTag = vi.fn()
    const onRemoveTag = vi.fn()

    render(
      <>
        <NoteTagsRow
          tags={['shared']}
          locale="en"
          onRemoveTag={onRemoveTag}
        />
        <NoteTagsPicker
          tags={['shared']}
          availableTags={options}
          locale="en"
          onAddTag={onAddTag}
        />
      </>,
    )

    expect(screen.getByTestId('note-tag-row')).toHaveTextContent('shared')
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag shared' }))
    expect(onRemoveTag).toHaveBeenCalledWith('shared')

    fireEvent.click(screen.getByTestId('note-tag-add'))
    const input = screen.getByRole('textbox', { name: 'Add tag' })
    fireEvent.change(input, { target: { value: 'New-Tag' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create "new-tag"' }))

    expect(onAddTag).toHaveBeenCalledWith('new-tag')
  })

  it('shows validation feedback and does not create unsupported tag input', () => {
    render(
      <NoteTagsPicker
        tags={[]}
        availableTags={[]}
        locale="en"
        onAddTag={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('note-tag-row')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('note-tag-add'))
    const input = screen.getByRole('textbox', { name: 'Add tag' })
    fireEvent.change(input, { target: { value: 'bad_tag' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Use only letters, numbers, and hyphens.')
    expect(screen.queryByTestId('note-tag-create')).not.toBeInTheDocument()
  })
})
