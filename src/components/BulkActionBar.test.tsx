import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BulkActionBar } from './BulkActionBar'

describe('BulkActionBar', () => {
  const defaultProps = {
    count: 3,
    onDelete: vi.fn(),
    onClear: vi.fn(),
  }

  it('shows only delete and clear actions', () => {
    render(<BulkActionBar {...defaultProps} />)
    expect(screen.getByTestId('bulk-delete-btn')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-clear-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('bulk-organize-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bulk-archive-btn')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bulk-unarchive-btn')).not.toBeInTheDocument()
    expect(screen.queryByText('Organize')).not.toBeInTheDocument()
    expect(screen.queryByText('Archive')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('shows selected count', () => {
    render(<BulkActionBar {...defaultProps} count={5} />)
    expect(screen.getByText('5 selected')).toBeInTheDocument()
  })

  it('exposes accessible names and a destructive variant for icon-only actions', () => {
    render(<BulkActionBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Permanently delete selected notes' })).toHaveAttribute('data-variant', 'destructive')
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
  })

  it('keeps the icon-only controls focusable and activatable', () => {
    const onDelete = vi.fn()
    const onClear = vi.fn()

    render(
      <BulkActionBar
        {...defaultProps}
        onDelete={onDelete}
        onClear={onClear}
      />,
    )

    const deleteButton = screen.getByRole('button', { name: 'Permanently delete selected notes' })
    const clearButton = screen.getByRole('button', { name: 'Clear selection' })

    deleteButton.focus()
    expect(deleteButton).toHaveFocus()
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledTimes(1)

    clearButton.focus()
    expect(clearButton).toHaveFocus()
    fireEvent.click(clearButton)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

})
