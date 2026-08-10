import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RestoreDeletedNoteDialog } from './RestoreDeletedNoteDialog'
import {
  getDeletedNotePreview,
  listDeletedNotes,
  restoreDeletedNote,
} from '../utils/deletedNoteRecovery'

vi.mock('../utils/deletedNoteRecovery', () => ({
  getDeletedNotePreview: vi.fn(),
  listDeletedNotes: vi.fn(),
  restoreDeletedNote: vi.fn(),
}))

const mockedListDeletedNotes = vi.mocked(listDeletedNotes)
const mockedGetDeletedNotePreview = vi.mocked(getDeletedNotePreview)
const mockedRestoreDeletedNote = vi.mocked(restoreDeletedNote)

describe('RestoreDeletedNoteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists deleted notes, previews the selected note, and restores it', async () => {
    mockedListDeletedNotes.mockResolvedValue([
      { relativePath: 'archive/old-note.md', title: 'old-note', deletedAt: '2026-08-10T10:00:00Z' },
    ])
    mockedGetDeletedNotePreview.mockResolvedValue({
      relativePath: 'archive/old-note.md',
      content: '# Old note\n\nRecovered content.\n',
    })
    mockedRestoreDeletedNote.mockResolvedValue({
      relativePath: 'archive/old-note.md',
      snapshotCreated: true,
      snapshotError: null,
    })
    const onClose = vi.fn()
    const onRestored = vi.fn()

    render(
      <RestoreDeletedNoteDialog
        open
        managed
        vaultPath="/vault"
        onClose={onClose}
        onRestored={onRestored}
      />,
    )

    expect(await screen.findByTestId('restore-deleted-note-item')).toHaveTextContent('archive/old-note.md')
    await waitFor(() => expect(screen.getByTestId('restore-deleted-note-preview')).toHaveTextContent('Recovered content.'))

    fireEvent.click(screen.getByTestId('restore-deleted-note-submit'))

    await waitFor(() => expect(mockedRestoreDeletedNote).toHaveBeenCalledWith('/vault', 'archive/old-note.md'))
    expect(onRestored).toHaveBeenCalledWith('archive/old-note.md')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not query recovery history for a non-managed vault', () => {
    render(
      <RestoreDeletedNoteDialog
        open
        managed={false}
        vaultPath="/vault"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('restore-deleted-note-unavailable')).toBeInTheDocument()
    expect(mockedListDeletedNotes).not.toHaveBeenCalled()
  })
})
