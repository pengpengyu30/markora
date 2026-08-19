import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCommandRegistry, groupSortKey } from './useCommandRegistry'
import type { CommandAction } from './useCommandRegistry'
import { formatShortcutDisplay } from './appCommandCatalog'

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    activeTabPath: '/vault/test.md',
    entries: [],
    onQuickOpen: vi.fn(),
    onCreateNote: vi.fn(),
    onSave: vi.fn(),
    onPastePlainText: vi.fn(),
    onOpenSettings: vi.fn(),
    onDeleteNote: vi.fn(),
    onArchiveNote: vi.fn(),
    onUnarchiveNote: vi.fn(),
    onToggleOrganized: vi.fn(),
    onSetViewMode: vi.fn(),
    onToggleBacklinks: vi.fn(),
    onToggleRawEditor: vi.fn(),
    noteWidth: 'normal',
    defaultNoteWidth: 'normal',
    onSetNoteWidth: vi.fn(),
    onSetDefaultNoteWidth: vi.fn(),
    onOpenVault: vi.fn(),
    activeNoteModified: false,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    zoomLevel: 100,
    onSelect: vi.fn(),
    onCloseTab: vi.fn(),
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    canGoBack: false,
    canGoForward: false,
    ...overrides,
  }
}

function findCommand(commands: CommandAction[], id: string): CommandAction | undefined {
  return commands.find(c => c.id === id)
}

function expectFolderCommandStates(overrides: Record<string, unknown>, expected: {
  copy: boolean
  delete: boolean
  rename: boolean
  reveal: boolean
}) {
  const { result } = renderHook(() => useCommandRegistry(makeConfig(overrides)))

  expect(findCommand(result.current, 'reveal-selected-folder')?.enabled).toBe(expected.reveal)
  expect(findCommand(result.current, 'copy-selected-folder-path')?.enabled).toBe(expected.copy)
  expect(findCommand(result.current, 'rename-folder')?.enabled).toBe(expected.rename)
  expect(findCommand(result.current, 'delete-folder')?.enabled).toBe(expected.delete)
}

describe('useCommandRegistry', () => {
  it('exposes command palette actions for changing the focused editor block type', () => {
    const onTurnCurrentBlockInto = vi.fn()
    const config = makeConfig({ onTurnCurrentBlockInto })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'turn-current-block-into-heading-2')

    expect(cmd).toMatchObject({
      enabled: true,
      group: 'Note',
      label: 'Turn Current Block into Heading 2',
    })
    expect(cmd?.keywords).toEqual(expect.arrayContaining([
      'block',
      'convert',
      'heading',
      'turn into',
    ]))
    expect(findCommand(result.current, 'turn-current-block-into-code-block')?.shortcut).toBe(
      formatShortcutDisplay({ display: '⌘⇧`' }),
    )

    cmd?.execute()

    expect(onTurnCurrentBlockInto).toHaveBeenCalledWith(expect.objectContaining({
      key: 'heading-2',
      props: { level: 2 },
      type: 'heading',
    }))
  })

  it('disables focused block type commands outside markdown notes', () => {
    const config = makeConfig({
      activeTabPath: '/vault/Attachments/photo.png',
      entries: [{ path: '/vault/Attachments/photo.png', title: 'photo.png', fileKind: 'binary' }],
      onTurnCurrentBlockInto: vi.fn(),
    })
    const { result } = renderHook(() => useCommandRegistry(config))

    expect(findCommand(result.current, 'turn-current-block-into-heading-2')?.enabled).toBe(false)
  })

  it('enables Move Note to Folder only when another folder destination exists', () => {
    const onMoveNoteToFolder = vi.fn()
    const { result, rerender } = renderHook(
      (props) => useCommandRegistry(props),
      {
        initialProps: makeConfig({
          onMoveNoteToFolder,
          canMoveNoteToFolder: true,
        }),
      },
    )

    expect(findCommand(result.current, 'move-note-to-folder')?.enabled).toBe(true)
    findCommand(result.current, 'move-note-to-folder')!.execute()
    expect(onMoveNoteToFolder).toHaveBeenCalledOnce()

    rerender(makeConfig({
      onMoveNoteToFolder,
      canMoveNoteToFolder: false,
    }))
    expect(findCommand(result.current, 'move-note-to-folder')?.enabled).toBe(false)
  })

  it('does not expose app-level undo or redo commands', () => {
    const { result } = renderHook(() => useCommandRegistry(makeConfig({
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      canUndo: true,
      canRedo: true,
      undoLabel: 'Archive Note',
      redoLabel: 'Archive Note',
    })))

    expect(findCommand(result.current, 'undo-action')).toBeUndefined()
    expect(findCommand(result.current, 'redo-action')).toBeUndefined()
  })

  it('exposes active file actions when a note is selected', () => {
    const onRevealActiveFile = vi.fn()
    const onCopyActiveFilePath = vi.fn()
    const onExportNoteAsPdf = vi.fn()
    const config = makeConfig({
      activeTabPath: '/vault/current.md',
      entries: [{ path: '/vault/current.md', title: 'Current', fileKind: 'markdown' }],
      onRevealActiveFile,
      onCopyActiveFilePath,
      onExportNoteAsPdf,
    })
    const { result } = renderHook(() => useCommandRegistry(config))

    expect(findCommand(result.current, 'reveal-active-file')).toMatchObject({
      enabled: true,
      group: 'Note',
      label: 'Reveal in Finder',
    })
    expect(findCommand(result.current, 'copy-active-file-path')).toMatchObject({
      enabled: true,
      group: 'Note',
      label: 'Copy File Path',
    })
    expect(findCommand(result.current, 'copy-active-deep-link')).toBeUndefined()
    expect(findCommand(result.current, 'export-note-pdf')).toMatchObject({
      enabled: true,
      group: 'Note',
      label: 'Export note as PDF',
    })

    findCommand(result.current, 'reveal-active-file')!.execute()
    findCommand(result.current, 'copy-active-file-path')!.execute()
    findCommand(result.current, 'export-note-pdf')!.execute()

    expect(onRevealActiveFile).toHaveBeenCalledWith('/vault/current.md')
    expect(onCopyActiveFilePath).toHaveBeenCalledWith('/vault/current.md')
    expect(onExportNoteAsPdf).toHaveBeenCalledOnce()
  })

  it('only enables file-kind specific actions for supported active files', () => {
    const onOpenActiveFileExternal = vi.fn()
    const onExportNoteAsPdf = vi.fn()
    const { result, rerender } = renderHook(
      (props) => useCommandRegistry(props),
      {
        initialProps: makeConfig({
          activeTabPath: '/vault/current.md',
          entries: [{ path: '/vault/current.md', title: 'Current', fileKind: 'markdown' }],
          onOpenActiveFileExternal,
          onExportNoteAsPdf,
        }),
      },
    )

    expect(findCommand(result.current, 'open-active-file-external')?.enabled).toBe(false)
    expect(findCommand(result.current, 'export-note-pdf')?.enabled).toBe(true)

    rerender(makeConfig({
      activeTabPath: '/vault/Attachments/photo.png',
      entries: [{ path: '/vault/Attachments/photo.png', title: 'photo.png', fileKind: 'binary' }],
      onOpenActiveFileExternal,
      onExportNoteAsPdf,
    }))

    const command = findCommand(result.current, 'open-active-file-external')!
    expect(command.enabled).toBe(true)
    expect(findCommand(result.current, 'export-note-pdf')?.enabled).toBe(false)
    command.execute()
    expect(onOpenActiveFileExternal).toHaveBeenCalledWith('/vault/Attachments/photo.png')
  })

  it('disables Toggle Raw Editor when the active file cannot switch to rich mode', () => {
    const config = makeConfig({ onToggleRawEditor: undefined })
    const { result } = renderHook(() => useCommandRegistry(config))
    expect(findCommand(result.current, 'toggle-raw-editor')?.enabled).toBe(false)
  })

  it('exposes command palette actions for note width modes', () => {
    const onSetNoteWidth = vi.fn()
    const config = makeConfig({ noteWidth: 'normal', onSetNoteWidth })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'set-note-width-wide')

    expect(cmd).toBeDefined()
    expect(cmd!.group).toBe('View')
    expect(cmd!.label).toBe('Use Wide Note Width')
    expect(cmd!.keywords).toContain('wide')

    cmd!.execute()

    expect(onSetNoteWidth).toHaveBeenCalledWith('wide')
  })

  it('disables the command for the active note width mode', () => {
    const config = makeConfig({ noteWidth: 'wide' })
    const { result } = renderHook(() => useCommandRegistry(config))

    expect(findCommand(result.current, 'set-note-width-wide')?.enabled).toBe(false)
    expect(findCommand(result.current, 'set-note-width-normal')?.enabled).toBe(true)
  })

  it('exposes command palette actions for the default note width', () => {
    const onSetDefaultNoteWidth = vi.fn()
    const config = makeConfig({ defaultNoteWidth: 'normal', onSetDefaultNoteWidth })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'set-default-note-width-wide')

    expect(cmd).toMatchObject({
      label: 'Use Wide Note Width by Default',
      group: 'View',
      enabled: true,
    })

    cmd!.execute()
    expect(onSetDefaultNoteWidth).toHaveBeenCalledWith('wide')
  })

  it('exposes command palette actions for light and dark mode', () => {
    const onSetThemeMode = vi.fn()
    const config = makeConfig({ onSetThemeMode })
    const { result } = renderHook(() => useCommandRegistry(config))
    const lightMode = findCommand(result.current, 'use-light-mode')
    const darkMode = findCommand(result.current, 'use-dark-mode')
    const systemMode = findCommand(result.current, 'use-system-theme-mode')

    expect(lightMode).toMatchObject({
      label: 'Use Light Mode',
      enabled: true,
      group: 'Settings',
    })
    expect(darkMode).toMatchObject({
      label: 'Use Dark Mode',
      enabled: true,
      group: 'Settings',
    })
    expect(systemMode).toMatchObject({
      label: 'Use System Theme',
      enabled: true,
      group: 'Settings',
    })

    lightMode?.execute()
    darkMode?.execute()
    systemMode?.execute()

    expect(onSetThemeMode).toHaveBeenNthCalledWith(1, 'light')
    expect(onSetThemeMode).toHaveBeenNthCalledWith(2, 'dark')
    expect(onSetThemeMode).toHaveBeenNthCalledWith(3, 'system')
  })

  it('omits Inbox navigation when the explicit workflow is disabled', () => {
    const config = makeConfig({ showInbox: false })
    const { result } = renderHook(() => useCommandRegistry(config))
    expect(findCommand(result.current, 'go-inbox')).toBeUndefined()
  })

  it('enables folder commands when a folder is selected', () => {
    expectFolderCommandStates({
      selection: { kind: 'folder', path: 'projects' },
      onRenameFolder: vi.fn(),
      onDeleteFolder: vi.fn(),
      onRevealSelectedFolder: vi.fn(),
      onCopySelectedFolderPath: vi.fn(),
    }, { copy: true, delete: true, rename: true, reveal: true })
  })

  it('disables folder commands outside folder selection', () => {
    expectFolderCommandStates({
      selection: { kind: 'filter', filter: 'all' },
      onRenameFolder: vi.fn(),
      onDeleteFolder: vi.fn(),
      onRevealSelectedFolder: vi.fn(),
      onCopySelectedFolderPath: vi.fn(),
    }, { copy: false, delete: false, rename: false, reveal: false })
  })

  it('keeps root folder reveal and copy commands enabled without destructive actions', () => {
    expectFolderCommandStates({
      selection: { kind: 'folder', path: '', rootPath: '/Users/luca/Laputa' },
      onRenameFolder: vi.fn(),
      onDeleteFolder: vi.fn(),
      onRevealSelectedFolder: vi.fn(),
      onCopySelectedFolderPath: vi.fn(),
    }, { copy: true, delete: false, rename: false, reveal: true })
  })

  it('executes folder command callbacks', () => {
    const onRenameFolder = vi.fn()
    const onDeleteFolder = vi.fn()
    const onRevealSelectedFolder = vi.fn()
    const onCopySelectedFolderPath = vi.fn()
    const config = makeConfig({
      selection: { kind: 'folder', path: 'projects' },
      onRenameFolder,
      onDeleteFolder,
      onRevealSelectedFolder,
      onCopySelectedFolderPath,
    })
    const { result } = renderHook(() => useCommandRegistry(config))

    findCommand(result.current, 'reveal-selected-folder')!.execute()
    findCommand(result.current, 'copy-selected-folder-path')!.execute()
    findCommand(result.current, 'rename-folder')!.execute()
    findCommand(result.current, 'delete-folder')!.execute()

    expect(onRevealSelectedFolder).toHaveBeenCalledTimes(1)
    expect(onCopySelectedFolderPath).toHaveBeenCalledTimes(1)
    expect(onRenameFolder).toHaveBeenCalledTimes(1)
    expect(onDeleteFolder).toHaveBeenCalledTimes(1)
  })

  it('omits the removed daily-note command', () => {
    const config = makeConfig()
    const { result } = renderHook(() => useCommandRegistry(config))
    expect(findCommand(result.current, 'open-daily-note')).toBeUndefined()
  })

  it('does not expose the removed contribution command', () => {
    const { result } = renderHook(() => useCommandRegistry(makeConfig()))
    expect(findCommand(result.current, 'open-contribute')).toBeUndefined()
  })

  it('keeps a single canonical New Note command when generic note types are present', () => {
    const config = makeConfig({
      entries: [
        { path: '/type-note.md', title: 'Note', isA: 'Type' },
        { path: '/lowercase-note.md', title: 'lowercase-note', isA: 'note' },
      ],
    })
    const { result } = renderHook(() => useCommandRegistry(config))

    const newNoteCommands = result.current.filter(command => command.label.toLowerCase() === 'new note')

    expect(newNoteCommands).toHaveLength(1)
    expect(newNoteCommands[0]).toMatchObject({
      id: 'create-note',
      shortcut: formatShortcutDisplay({ display: '⌘N' }),
    })
  })

  it('exposes a current-folder create command only when a folder is selected', () => {
    const onCreateNote = vi.fn()
    const { result } = renderHook(() => useCommandRegistry(makeConfig({
      onCreateNote,
      selection: { kind: 'folder', path: 'Projects/2026 Planning', rootPath: '/vault' },
    })))

    const command = findCommand(result.current, 'create-note-current-folder')
    expect(command).toMatchObject({
      label: 'Create New Note in Current Folder',
      group: 'Note',
      enabled: true,
    })

    command!.execute()
    expect(onCreateNote).toHaveBeenCalledWith({
      creationPath: 'folder_command_palette',
      folderPath: 'Projects/2026 Planning',
      vaultPath: '/vault',
    })
  })

  it('does not expose the removed sheet create command', () => {
    const { result } = renderHook(() => useCommandRegistry(makeConfig()))

    expect(findCommand(result.current, 'create-sheet')).toBeUndefined()
  })

  it('disables the current-folder create command outside folder selections', () => {
    const { result } = renderHook(() => useCommandRegistry(makeConfig({
      selection: { kind: 'filter', filter: 'all' },
    })))

    expect(findCommand(result.current, 'create-note-current-folder')?.enabled).toBe(false)
  })

  it('exposes paste without formatting in the command palette', () => {
    const onPastePlainText = vi.fn()
    const { result } = renderHook(() => useCommandRegistry(makeConfig({ onPastePlainText })))
    const command = findCommand(result.current, 'paste-plain-text')

    expect(command).toMatchObject({
      label: 'Paste without formatting',
      group: 'Note',
      shortcut: formatShortcutDisplay({ display: '⌘⇧V' }),
      enabled: true,
    })

    command!.execute()
    expect(onPastePlainText).toHaveBeenCalledOnce()
  })

})

describe('groupSortKey', () => {
  it('returns correct order for groups', () => {
    expect(groupSortKey('Navigation')).toBeLessThan(groupSortKey('Note'))
    expect(groupSortKey('Note')).toBeLessThan(groupSortKey('View'))
  })
})

describe('reload-vault command', () => {
  it('is present in Settings group', () => {
    const config = makeConfig({ onReloadVault: vi.fn() })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'reload-vault')
    expect(cmd).toBeDefined()
    expect(cmd!.group).toBe('Settings')
    expect(cmd!.label).toBe('Reload Project')
  })

  it('is enabled when onReloadVault is provided', () => {
    const config = makeConfig({ onReloadVault: vi.fn() })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'reload-vault')
    expect(cmd!.enabled).toBe(true)
  })

  it('is disabled when onReloadVault is not provided', () => {
    const config = makeConfig()
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'reload-vault')
    expect(cmd!.enabled).toBe(false)
  })

  it('executes onReloadVault callback', () => {
    const onReloadVault = vi.fn()
    const config = makeConfig({ onReloadVault })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'reload-vault')
    cmd!.execute()
    expect(onReloadVault).toHaveBeenCalled()
  })

  it('has searchable keywords', () => {
    const config = makeConfig({ onReloadVault: vi.fn() })
    const { result } = renderHook(() => useCommandRegistry(config))
    const cmd = findCommand(result.current, 'reload-vault')
    expect(cmd!.keywords).toContain('reload')
    expect(cmd!.keywords).toContain('refresh')
    expect(cmd!.keywords).toContain('rescan')
  })

})
