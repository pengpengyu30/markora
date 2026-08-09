import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoteItem } from './NoteItem'
import { makeEntry } from '../test-utils/noteListTestUtils'

const NOW_SECONDS = 1_744_286_400

afterEach(() => {
  vi.useRealTimers()
})

describe('NoteItem', () => {
  it('renders unsupported binary files as non-clickable muted rows', () => {
    const entry = makeEntry({
      path: '/vault/archive.zip',
      filename: 'archive.zip',
      title: 'archive.zip',
      fileKind: 'binary',
    })
    const onClickNote = vi.fn()

    render(<NoteItem entry={entry} isSelected={false} onClickNote={onClickNote} />)

    const item = screen.getByTestId('binary-file-item')
    expect(item).toHaveClass('opacity-50')
    expect(item).toHaveAttribute('title', 'Cannot open this file type')

    fireEvent.click(item)
    expect(onClickNote).not.toHaveBeenCalled()
  })

  it.each([
    { kind: 'image', filename: 'photo.png', title: 'Open image preview' },
    { kind: 'pdf', filename: 'brief.pdf', title: 'Open PDF preview' },
    { kind: 'audio', filename: 'interview.mp3', title: 'Open audio preview' },
    { kind: 'video', filename: 'demo.mp4', title: 'Open video preview' },
  ])('renders $kind files as clickable preview rows', ({ kind, filename, title }) => {
    const entry = makeEntry({
      path: `/vault/${filename}`,
      filename,
      title: filename,
      fileKind: 'binary',
    })
    const onClickNote = vi.fn()

    render(<NoteItem entry={entry} isSelected={false} onClickNote={onClickNote} />)

    const item = screen.getByTestId(`${kind}-file-item`)
    expect(item).not.toHaveClass('opacity-50')
    expect(item).toHaveAttribute('title', title)

    fireEvent.click(item)
    expect(onClickNote).toHaveBeenCalledWith(entry, expect.any(Object))
  })

  it('renders text files as clickable rows', () => {
    const entry = makeEntry({
      path: '/vault/config.yml',
      filename: 'config.yml',
      title: 'config.yml',
      fileKind: 'text',
    })
    const onClickNote = vi.fn()

    render(<NoteItem entry={entry} isSelected={false} onClickNote={onClickNote} />)

    fireEvent.click(screen.getByText('config.yml').closest('div')!)
    expect(onClickNote).toHaveBeenCalledWith(entry, expect.any(Object))
  })

  it('writes the note path into drag data for folder retargeting', () => {
    const entry = makeEntry({
      path: '/vault/projects/alpha.md',
      filename: 'alpha.md',
      title: 'Alpha',
    })
    const dataTransfer = {
      effectAllowed: 'none',
      setData: vi.fn(),
    }

    render(<NoteItem entry={entry} isSelected={false} onClickNote={vi.fn()} />)

    const item = screen.getByRole('option')
    expect(item).toHaveAttribute('draggable', 'true')
    fireEvent.dragStart(item, { dataTransfer })

    expect(dataTransfer.effectAllowed).toBe('move')
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-tolaria-note-path', entry.path)
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', entry.path)
  })

  it('shows the title with filename metadata when a change status is present', () => {
    const entry = {
      ...makeEntry({ filename: 'my-note.md', title: 'My Note Title' }),
      __changeAddedLines: 42,
      __changeDeletedLines: 7,
    }

    render(<NoteItem entry={entry} isSelected={false} onClickNote={vi.fn()} changeStatus="modified" />)

    expect(screen.getByText('My Note Title')).toBeInTheDocument()
    expect(screen.getByText('my-note.md')).toBeInTheDocument()
    expect(screen.getByTestId('change-note-filename')).toHaveClass('truncate', 'text-[12px]', 'leading-[1.5]', 'text-muted-foreground')
    expect(screen.getByTestId('change-stat-added')).toHaveTextContent('+42')
    expect(screen.getByTestId('change-stat-deleted')).toHaveTextContent('-7')
  })

  it.each([
    { status: 'modified' as const, symbol: '·' },
    { status: 'added' as const, symbol: '+' },
  ])('renders the correct symbol for $status files', ({ status, symbol }) => {
    render(
      <NoteItem
        entry={makeEntry({ filename: `${status}-note.md` })}
        isSelected={false}
        onClickNote={vi.fn()}
        changeStatus={status}
      />,
    )

    expect(screen.getByTestId('change-status-icon')).toHaveTextContent(symbol)
  })

  it('shows a neutral fallback when line stats are unavailable', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'binary-note.md', title: 'Binary Note' })}
        isSelected={false}
        onClickNote={vi.fn()}
        changeStatus="modified"
      />,
    )

    expect(screen.getByTestId('change-stat-fallback')).toHaveTextContent('Diff unavailable')
  })

  it('renders the regular title when no change status is set', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'note.md', title: 'My Note' })}
        isSelected={false}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.queryByText('note.md')).not.toBeInTheDocument()
    expect(screen.queryByTestId('change-status-icon')).not.toBeInTheDocument()
  })

  it('keeps note content sections spaced consistently', () => {
    render(
      <NoteItem
        entry={makeEntry({ title: 'Spaced note', snippet: 'Body preview' })}
        isSelected={false}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('note-content-stack')).toHaveClass('space-y-2')
  })

  it('shows created date on the right side of the date row when available', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    render(
      <NoteItem
        entry={makeEntry({
          title: 'Dated note',
          createdAt: NOW_SECONDS - 86400 * 5,
          modifiedAt: NOW_SECONDS - 86400 * 2,
        })}
        isSelected={false}
        onClickNote={vi.fn()}
      />,
    )

    const dateRow = screen.getByTestId('note-date-row')
    expect(dateRow).toHaveTextContent('April 8, 2025')
    expect(dateRow).toHaveTextContent('Created April 5, 2025')
  })

  it('shows the workspace badge after the creation date when multiple workspaces are present', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    const launchWorkspace = {
      id: 'launch',
      label: 'Launch',
      alias: 'launch',
      path: '/launch',
      shortLabel: 'LA',
      color: 'red',
      icon: null,
      mounted: true,
      available: true,
      defaultForNewNotes: false,
    }
    const personalWorkspace = {
      id: 'personal',
      label: 'Personal',
      alias: 'personal',
      path: '/personal',
      shortLabel: 'PE',
      color: 'blue',
      icon: null,
      mounted: true,
      available: true,
      defaultForNewNotes: true,
    }
    const entry = makeEntry({
      title: 'Campaigns',
      createdAt: NOW_SECONDS - 600,
      modifiedAt: NOW_SECONDS - 600,
      workspace: launchWorkspace,
    })
    const otherEntry = makeEntry({
      path: '/personal/other.md',
      filename: 'other.md',
      title: 'Other',
      workspace: personalWorkspace,
    })

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        allEntries={[entry, otherEntry]}
        onClickNote={vi.fn()}
      />,
    )

    const dateRow = screen.getByTestId('note-date-row')
    const badge = within(dateRow).getByTestId('workspace-badge')
    expect(screen.getByTestId('note-title-row')).not.toContainElement(badge)
    expect(dateRow).toHaveTextContent('Created April 10, 2025')
    expect(badge).toHaveTextContent('LA')
    expect(badge).toHaveClass('-mr-1.5', 'border', 'bg-transparent', 'opacity-75')
  })

  it('leaves the created-date label hidden when no creation date exists', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    render(
      <NoteItem
        entry={makeEntry({
          title: 'Modified note',
          createdAt: null,
          modifiedAt: NOW_SECONDS - 3600,
        })}
        isSelected={false}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('note-date-row')).toHaveTextContent('April 10, 2025')
    expect(screen.queryByText(/Created /)).not.toBeInTheDocument()
  })
})
