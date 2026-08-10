import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../hooks/appCommandCatalog'
import { makeEntry, mockEntries, renderNoteList } from '../test-utils/noteListTestUtils'

function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
}

function renderNoteListWithFullActionMenu() {
  renderNoteList({
    onBulkDeletePermanently: vi.fn(),
    onCopyFilePath: vi.fn(),
    onExportPdf: vi.fn(),
    onOpenInNewWindow: vi.fn(),
    onRenameFilename: vi.fn(),
    onRevealFile: vi.fn(),
  })
}

function openBuildLaputaActions() {
  fireEvent.contextMenu(screen.getByText('Build Laputa App'))
}

function clickBuildLaputaAction(label: string) {
  openBuildLaputaActions()
  fireEvent.click(screen.getByText(label))
}

describe('NoteList context menu', () => {
  it('opens note actions from a right-clicked note item', () => {
    const onOpenInNewWindow = vi.fn()
    const onBulkDeletePermanently = vi.fn()
    const onExportPdf = vi.fn()
    const onRenameFilename = vi.fn()
    const onRevealFile = vi.fn()
    const onCopyFilePath = vi.fn()

    renderNoteList({
      onOpenInNewWindow,
      onBulkDeletePermanently,
      onExportPdf,
      onRenameFilename,
      onRevealFile,
      onCopyFilePath,
    })

    openBuildLaputaActions()

    expect(screen.getByTestId('note-list-context-menu')).toBeInTheDocument()
    expect(screen.getByTestId('note-list-context-menu')).toHaveClass('z-[12000]')
    expect(screen.getByTestId('note-list-context-menu').parentElement).toBe(document.body)
    expect(screen.getByText(getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteOpenInNewWindow)!)).toBeInTheDocument()
    expect(screen.getByText(getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteDelete)!)).toBeInTheDocument()
    expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument()
    expect(screen.queryByText('Mark as Organized')).not.toBeInTheDocument()
    expect(screen.queryByText('Archive this note')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Open in New Window'))
    expect(onOpenInNewWindow).toHaveBeenCalledWith(mockEntries[0])

    clickBuildLaputaAction('Rename filename')
    expect(screen.getByTestId('note-list-rename-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('note-list-rename-input')).toHaveValue('26q1-laputa-app')
    fireEvent.change(screen.getByTestId('note-list-rename-input'), { target: { value: 'renamed-from-menu.md ' } })
    fireEvent.click(screen.getByText('Rename'))
    expect(onRenameFilename).toHaveBeenCalledWith(mockEntries[0].path, 'renamed-from-menu')

    clickBuildLaputaAction('Reveal in Finder')
    expect(onRevealFile).toHaveBeenCalledWith(mockEntries[0].path)

    clickBuildLaputaAction('Copy file path')
    expect(onCopyFilePath).toHaveBeenCalledWith(mockEntries[0].path)

    clickBuildLaputaAction('Export note as PDF')
    expect(onExportPdf).toHaveBeenCalledWith(mockEntries[0])

    clickBuildLaputaAction('Delete this note')
    expect(onBulkDeletePermanently).toHaveBeenCalledWith([mockEntries[0].path])
  }, 20_000)

  it('keeps file actions for PDF rows without status actions', () => {
    const pdfEntry = makeEntry({
      fileKind: 'binary',
      filename: 'research.pdf',
      path: '/vault/research.pdf',
      title: 'research.pdf',
    })
    const onCopyFilePath = vi.fn()
    const onRevealFile = vi.fn()
    const onRenameFilename = vi.fn()

    renderNoteList({
      allNotesFileVisibility: { pdfs: true, images: false, unsupported: false },
      entries: [pdfEntry],
      onCopyFilePath,
      onRenameFilename,
      onRevealFile,
    })

    fireEvent.contextMenu(screen.getByTestId('pdf-file-item'))

    expect(screen.getByTestId('note-list-context-menu')).toBeInTheDocument()
    expect(screen.queryByText('Mark as Organized')).not.toBeInTheDocument()
    expect(screen.queryByText('Archive this note')).not.toBeInTheDocument()
    expect(screen.queryByText('Rename filename')).not.toBeInTheDocument()
    expect(screen.getByText('Reveal in Finder')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Copy file path'))
    expect(onCopyFilePath).toHaveBeenCalledWith(pdfEntry.path)
  })

  it('keeps note actions visible when opened near the bottom-right viewport edge', () => {
    setViewportSize(1024, 768)
    renderNoteList({
      onOpenInNewWindow: vi.fn(),
      onBulkDeletePermanently: vi.fn(),
    })

    fireEvent.contextMenu(screen.getByText('Build Laputa App'), { clientX: 1000, clientY: 740 })

    const menu = screen.getByTestId('note-list-context-menu')
    expect(menu.style.left).toBe('')
    expect(menu.style.top).toBe('')
    expect(menu).toHaveStyle({
      bottom: '28px',
      maxHeight: '732px',
      right: '24px',
    })
  })

  it('caps note actions to the available viewport space from a mid-height right-click', () => {
    setViewportSize(420, 320)
    renderNoteListWithFullActionMenu()

    fireEvent.contextMenu(screen.getByText('Build Laputa App'), { clientX: 271, clientY: 157 })

    const menu = screen.getByTestId('note-list-context-menu')
    expect(menu).toHaveStyle({
      maxHeight: '155px',
      overflowY: 'auto',
      right: '149px',
      top: '157px',
    })
  })
})
