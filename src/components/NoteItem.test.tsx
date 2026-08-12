import { fireEvent, render, screen } from '@testing-library/react'
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

  it('renders the regular title', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'note.md', title: 'My Note' })}
        isSelected={false}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.queryByText('note.md')).not.toBeInTheDocument()
  })

  it('renders the filename stem when the note-list filename setting is enabled', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'project-plan.md', title: 'Project Plan H1' })}
        isSelected={false}
        onClickNote={vi.fn()}
        showFilename={true}
      />,
    )

    expect(screen.getByText('project-plan')).toBeInTheDocument()
    expect(screen.queryByText('Project Plan H1')).not.toBeInTheDocument()
    expect(screen.queryByText('project-plan.md')).not.toBeInTheDocument()
  })

  it('keeps non-Markdown extensions when the note-list filename setting is enabled', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'config.json', title: 'Configuration', fileKind: 'text' })}
        isSelected={false}
        onClickNote={vi.fn()}
        showFilename={true}
      />,
    )

    expect(screen.getByText('config.json')).toBeInTheDocument()
    expect(screen.queryByText('config')).not.toBeInTheDocument()
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument()
  })

  it('does not render a status dot for a clean note', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'clean.md', title: 'Clean note' })}
        isSelected={false}
        noteStatus="clean"
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('unsaved-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pending-save-indicator')).not.toBeInTheDocument()
  })

  it('renders exactly one green status dot for an unsaved note', () => {
    render(
      <NoteItem
        entry={makeEntry({ filename: 'draft.md', title: 'Draft note' })}
        isSelected={false}
        noteStatus="unsaved"
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getAllByTestId('unsaved-indicator')).toHaveLength(1)
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
