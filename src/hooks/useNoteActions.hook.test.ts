import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { RAPID_CREATE_NOTE_SETTLE_MS } from './useNoteCreation'
import { useNoteActions } from './useNoteActions'
import type { NoteActionsConfig } from './useNoteActions'
import { GITIGNORED_VISIBILITY_APPLIED_EVENT } from '../lib/gitignoredVisibilityEvents'
import { clearNoteContentCache, getCachedNoteContentEntry } from './noteContentCache'
import { updateMockFrontmatter } from './mockFrontmatterHelpers'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(() => false),
  addMockEntry: vi.fn(),
  updateMockContent: vi.fn(),
  trackMockChange: vi.fn(),
  mockInvoke: vi.fn().mockResolvedValue(''),
}))
vi.mock('./mockFrontmatterHelpers', () => ({
  updateMockFrontmatter: vi.fn().mockReturnValue('---\nupdated: true\n---\n'),
  deleteMockFrontmatterProperty: vi.fn().mockReturnValue('---\n---\n'),
}))

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/Users/luca/Laputa/test.md',
  filename: 'test.md',
  title: 'Test Note',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: 'Active',
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
  outgoingLinks: [],
  template: null,
  sort: null,
  sidebarLabel: null,
  view: null,
  visible: null,
  properties: {},
  organized: false,
  favorite: false,
  favoriteIndex: null,
  listPropertiesDisplay: [],
  hasH1: false,
  ...overrides,
})

describe('useNoteActions hook', () => {
  const addEntry = vi.fn()
  const removeEntry = vi.fn()
  const updateEntry = vi.fn()
  const setToastMessage = vi.fn()

  const makeConfig = (entries: VaultEntry[] = []): NoteActionsConfig => ({
    addEntry, removeEntry, entries, setToastMessage, updateEntry, vaultPath: '/test/vault',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(invoke).mockReset()
    vi.mocked(isTauri).mockReturnValue(false)
    clearNoteContentCache()
    vi.useRealTimers()
  })

  function renderActions(entries: VaultEntry[] = []) {
    return renderHook(() => useNoteActions(makeConfig(entries)))
  }

  async function flushAsyncWork() {
    await Promise.resolve()
    await Promise.resolve()
  }

  function savedNoteContentPaths() {
    return vi.mocked(mockInvoke).mock.calls.flatMap(([cmd, args]) => {
      if (cmd !== 'save_note_content') return []
      if (hasStringPath(args)) return [args.path]
      return []
    })
  }

  function hasStringPath(value: unknown): value is { path: string } {
    if (typeof value !== 'object') return false
    if (value === null) return false
    if (!('path' in value)) return false
    return typeof value.path === 'string'
  }

  async function createImmediateEntry() {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const { result } = renderActions()
    await act(async () => {
      result.current.handleCreateNoteImmediate()
      await flushAsyncWork()
    })
    const [createdEntry] = addEntry.mock.calls[0]
    vi.restoreAllMocks()
    return createdEntry as VaultEntry
  }

  it('handleCreateNote creates the expected plain entry', async () => {
    const { result } = renderActions()

    await act(async () => {
      await result.current.handleCreateNote('Test Note')
    })

    expect(addEntry).toHaveBeenCalledTimes(1)
    const [createdEntry] = addEntry.mock.calls[0]
    expect(createdEntry.title).toBe('Test Note')
    expect(createdEntry.isA).toBeNull()
    expect(createdEntry.status).toBeNull()
    expect(createdEntry.path).toContain('test-note.md')
  })

  it('handleCreateNote opens tab immediately (before addEntry resolves)', () => {
    const callOrder: string[] = []
    const trackedAddEntry = vi.fn(() => { callOrder.push('addEntry') })
    const config = makeConfig()
    config.addEntry = trackedAddEntry

    const { result } = renderHook(() => useNoteActions(config))

    act(() => {
      result.current.handleCreateNote('Fast Note')
    })

    // Tab should be open with the new note
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].entry.title).toBe('Fast Note')
    expect(result.current.activeTabPath).toContain('fast-note.md')
  })

  it('handleNavigateWikilink finds entry by title', async () => {
    const target = makeEntry({ title: 'Target Note', path: '/vault/target.md' })

    const { result } = renderHook(() => useNoteActions(makeConfig([target])))

    await act(async () => {
      result.current.handleNavigateWikilink('Target Note')
    })

    expect(result.current.activeTabPath).toBe('/vault/target.md')
  })

  it.each(['html', 'HTM'])('loads .%s vault files into the editor for in-app preview', async (extension) => {
    const entry = makeEntry({
      path: `/test/vault/generated/report.${extension}`,
      filename: `report.${extension}`,
      fileKind: 'text',
    })
    const onOpenExternalFile = vi.fn()
    const config = { ...makeConfig([entry]), onOpenExternalFile }
    const { result } = renderHook(() => useNoteActions(config))

    await act(async () => {
      await result.current.handleSelectNote(entry)
    })

    expect(onOpenExternalFile).not.toHaveBeenCalled()
    expect(result.current.tabs).toEqual([{ entry, content: '' }])
    expect(result.current.activeTabPath).toBe(entry.path)
    expect(mockInvoke).toHaveBeenCalledWith('get_note_content', expect.objectContaining({
      path: entry.path,
    }))
  })

  it('handleNavigateWikilink warns when target not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useNoteActions(makeConfig()))

    act(() => {
      result.current.handleNavigateWikilink('Nonexistent')
    })

    expect(warnSpy).toHaveBeenCalledWith('Navigation target not found: Nonexistent')
    warnSpy.mockRestore()
  })

  it('keeps the active tab open when gitignored visibility reports a /tmp alias', async () => {
    const activeEntry = makeEntry({
      path: '/private/tmp/tolaria-vault/active.md',
      filename: 'active.md',
      title: 'Active',
    })
    const { result } = renderActions([activeEntry])

    await act(async () => {
      await result.current.handleSelectNote(activeEntry)
    })

    act(() => {
      window.dispatchEvent(new CustomEvent(GITIGNORED_VISIBILITY_APPLIED_EVENT, {
        detail: {
          hide: true,
          visiblePaths: ['/tmp/tolaria-vault/active.md'],
        },
      }))
    })

    expect(result.current.activeTabPath).toBe('/private/tmp/tolaria-vault/active.md')
    expect(result.current.tabs).toHaveLength(1)
  })

  it('handleUpdateFrontmatter calls updateEntry with the note-width patch', async () => {
    const { result } = renderHook(() => useNoteActions(makeConfig()))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(updateEntry).toHaveBeenCalledWith('/vault/note.md', { noteWidth: 'wide' })
    expect(setToastMessage).toHaveBeenCalledWith('Property updated')
  })

  it('does not rerender for unopened-note frontmatter content refreshes', async () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useNoteActions(makeConfig())
    })
    const initialRenders = renders

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/unopened.md', '_width', 'wide', { silent: true })
    })

    expect(result.current.tabs).toEqual([])
    expect(renders).toBe(initialRenders)
    expect(updateEntry).toHaveBeenCalledWith('/vault/unopened.md', { noteWidth: 'wide' })
  })

  it('marks Tauri frontmatter writes as internal before invoking the command', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    const order: string[] = []
    const onInternalVaultWrite = vi.fn((path: string) => {
      order.push(`mark:${path}`)
    })
    vi.mocked(invoke).mockImplementation(async (command) => {
      order.push(`invoke:${String(command)}`)
      return '---\n_width: wide\n---\nBody'
    })

    const { result } = renderHook(() => useNoteActions({
      ...makeConfig(),
      onInternalVaultWrite,
    }))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(onInternalVaultWrite).toHaveBeenCalledWith('/vault/note.md')
    expect(order).toEqual(['mark:/vault/note.md', 'invoke:update_frontmatter'])
  })

  it('records successful frontmatter updates for undo and redo', async () => {
    const entry = makeEntry({ path: '/vault/note.md', noteWidth: 'normal' })
    const { result } = renderHook(() => useNoteActions(makeConfig([entry])))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(result.current.canUndo).toBe(true)
    expect(result.current.undoLabel).toBe('Update _width')

    await act(async () => {
      await result.current.handleUndo()
    })
    await act(async () => {
      await result.current.handleRedo()
    })

    expect(updateEntry).toHaveBeenCalledWith('/vault/note.md', { noteWidth: 'normal' })
    expect(updateEntry).toHaveBeenCalledWith('/vault/note.md', { noteWidth: 'wide' })
    expect(updateEntry).toHaveBeenLastCalledWith('/vault/note.md', { noteWidth: 'wide' })
  })

  it('does not record silent or failed frontmatter updates', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = makeEntry({ path: '/vault/note.md', noteWidth: 'normal' })
    const { result } = renderHook(() => useNoteActions(makeConfig([entry])))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide', { silent: true })
    })
    expect(result.current.canUndo).toBe(false)

    vi.mocked(updateMockFrontmatter).mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(result.current.canUndo).toBe(false)
    errorSpy.mockRestore()
  })

  it('keeps a frontmatter write in the note cache after a note switch wins the apply guard', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    const noteA = makeEntry({ path: '/vault/note-a.md', filename: 'note-a.md', title: 'Note A' })
    const noteB = makeEntry({ path: '/vault/note-b.md', filename: 'note-b.md', title: 'Note B' })
    const updatedContent = '---\n_width: wide\n---\nBody'
    let resolveFrontmatterWrite: ((content: string) => void) | null = null
    vi.mocked(invoke).mockImplementation(() => new Promise((resolve) => {
      resolveFrontmatterWrite = (content) => { resolve(content) }
    }))

    const { result } = renderHook(() => useNoteActions(makeConfig([noteA, noteB])))
    act(() => {
      result.current.handleSwitchTab(noteA.path)
    })

    let updatePromise: Promise<void> = Promise.resolve()
    await act(async () => {
      updatePromise = result.current.handleUpdateFrontmatter(
        noteA.path,
        '_WIDTH',
        'wide',
        { requireActivePath: noteA.path },
      )
      await Promise.resolve()
    })
    act(() => {
      result.current.handleSwitchTab(noteB.path)
    })
    await act(async () => {
      resolveFrontmatterWrite?.(updatedContent)
      await updatePromise
    })

    expect(updateEntry).not.toHaveBeenCalled()
    expect(setToastMessage).not.toHaveBeenCalled()
    expect(getCachedNoteContentEntry(noteA.path)?.value).toBe(updatedContent)
  })

  it('handleCreateNoteImmediate creates note with timestamp-based title', async () => {
    const createdEntry = await createImmediateEntry()
    expect(createdEntry.title).toBe('Untitled Note 1700000000')
    expect(createdEntry.filename).toBe('untitled-note-1700000000.md')
    expect(createdEntry.isA).toBeNull()
  })

  it('handleCreateNoteImmediate generates unique names on rapid calls via timestamp', async () => {
    vi.useFakeTimers()
    let ts = 1700000000000
    vi.spyOn(Date, 'now').mockImplementation(() => { ts += 1000; return ts })
    const { result } = renderHook(() => useNoteActions(makeConfig()))

    await act(async () => {
      result.current.handleCreateNoteImmediate()
      result.current.handleCreateNoteImmediate()
      result.current.handleCreateNoteImmediate()
      await flushAsyncWork()
    })
    await act(async () => {
      vi.advanceTimersByTime(RAPID_CREATE_NOTE_SETTLE_MS)
      await flushAsyncWork()
    })
    await act(async () => {
      vi.advanceTimersByTime(RAPID_CREATE_NOTE_SETTLE_MS)
      await flushAsyncWork()
    })

    expect(addEntry).toHaveBeenCalledTimes(3)
    const filenames = addEntry.mock.calls.map(([e]: [VaultEntry]) => e.filename)
    // Each call consumes Date.now() multiple times, so just verify uniqueness and pattern
    expect(new Set(filenames).size).toBe(3)
    for (const fn of filenames) {
      expect(fn).toMatch(/^untitled-note-\d+\.md$/)
    }
    vi.restoreAllMocks()
  })

  it('handleCreateNote leaves the new note body empty', () => {
    const { result } = renderHook(() => useNoteActions(makeConfig()))

    act(() => {
      result.current.handleCreateNote('My Project')
    })

    const tabContent = result.current.tabs[0].content
    expect(tabContent).toBe('')
  })

  it.each(['custom_field', 'status', 'type', '_archived'])('ignores removed or unknown frontmatter key %s', async (key) => {
    const { result } = renderHook(() => useNoteActions(makeConfig()))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', key, 'value')
    })

    expect(updateEntry).not.toHaveBeenCalled()
    expect(setToastMessage).not.toHaveBeenCalled()
  })

  describe('pending save lifecycle', () => {
    it.each([
      ['start', 'Pending Test', 'pending-test.md', 'addPendingSave'],
      ['completion', 'Persist OK', 'persist-ok.md', 'removePendingSave'],
    ])('createAndPersist calls pending-save callback on %s (non-Tauri)', async (
      _phase,
      title,
      pathFragment,
      callbackName,
    ) => {
      const addPendingSave = vi.fn()
      const removePendingSave = vi.fn()
      const config = makeConfig()
      config.addPendingSave = addPendingSave
      config.removePendingSave = removePendingSave

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        result.current.handleCreateNote(title)
        await flushAsyncWork()
      })

      const callback = callbackName === 'addPendingSave' ? addPendingSave : removePendingSave
      expect(callback).toHaveBeenCalledWith(expect.stringContaining(pathFragment))
    })

    it('createAndPersist calls removePendingSave AND reverts when persist fails (Tauri)', async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'))
      const addPendingSave = vi.fn()
      const removePendingSave = vi.fn()
      const config = makeConfig()
      config.addPendingSave = addPendingSave
      config.removePendingSave = removePendingSave

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        result.current.handleCreateNote('Fail Save')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(addPendingSave).toHaveBeenCalledWith(expect.stringContaining('fail-save.md'))
      expect(removePendingSave).toHaveBeenCalledWith(expect.stringContaining('fail-save.md'))
      expect(removeEntry).toHaveBeenCalledWith(expect.stringContaining('fail-save.md'))
      expect(setToastMessage).toHaveBeenCalledWith('Failed to create note — disk write error')
    })

    it('handleCreateNoteImmediate creates the backing file before opening the note', async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      vi.mocked(invoke).mockResolvedValueOnce(undefined)
      const addPendingSave = vi.fn()
      const removePendingSave = vi.fn()
      const onNewNotePersisted = vi.fn()
      const config = makeConfig()
      config.addPendingSave = addPendingSave
      config.removePendingSave = removePendingSave
      config.onNewNotePersisted = onNewNotePersisted

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        result.current.handleCreateNoteImmediate()
        await flushAsyncWork()
      })

      const createdPath = expect.stringMatching(/untitled-note-\d+\.md$/)
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('create_note_content', {
        path: createdPath,
        content: '\n# \n\n',
        vaultPath: '/test/vault',
      })
      expect(addPendingSave).toHaveBeenCalledWith(createdPath)
      expect(removePendingSave).toHaveBeenCalledWith(createdPath)
      expect(onNewNotePersisted).toHaveBeenCalledOnce()
      expect(onNewNotePersisted).toHaveBeenCalledWith(createdPath)
      expect(addEntry).toHaveBeenCalledTimes(1)
      expect(result.current.tabs[0].entry.path).toMatch(/untitled-note-\d+\.md$/)
    })

    it('calls onNewNotePersisted after successful disk write (non-Tauri)', async () => {
      const onNewNotePersisted = vi.fn()
      const config = makeConfig()
      config.onNewNotePersisted = onNewNotePersisted

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        result.current.handleCreateNote('Persist Callback')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(onNewNotePersisted).toHaveBeenCalledTimes(1)
      expect(onNewNotePersisted).toHaveBeenCalledWith(expect.stringContaining('persist-callback.md'))
    })

    it('does not call onNewNotePersisted when disk write fails (Tauri)', async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'))
      const onNewNotePersisted = vi.fn()
      const config = makeConfig()
      config.onNewNotePersisted = onNewNotePersisted

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        result.current.handleCreateNote('Fail Persist')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(onNewNotePersisted).not.toHaveBeenCalled()
    })
  })

  describe('optimistic error recovery (Tauri mode)', () => {
    beforeEach(() => {
      vi.mocked(isTauri).mockReturnValue(true)
    })

    it('reverts optimistic note creation when disk write fails', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'))
      const { result } = renderHook(() => useNoteActions(makeConfig()))

      await act(async () => {
        result.current.handleCreateNote('Failing Note')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(addEntry).toHaveBeenCalledTimes(1)
      expect(removeEntry).toHaveBeenCalledWith(expect.stringContaining('failing-note.md'))
      expect(setToastMessage).toHaveBeenCalledWith('Failed to create note — disk write error')
    })

    it('does not revert when disk write succeeds', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(undefined)
      const { result } = renderHook(() => useNoteActions(makeConfig()))

      await act(async () => {
        result.current.handleCreateNote('Good Note')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(removeEntry).not.toHaveBeenCalled()
      expect(setToastMessage).not.toHaveBeenCalled()
    })

    it('handleCreateNoteImmediate writes each rapid note before opening it', async () => {
      vi.useFakeTimers()
      vi.mocked(invoke).mockResolvedValue(undefined)
      const { result } = renderHook(() => useNoteActions(makeConfig()))

      await act(async () => {
        result.current.handleCreateNoteImmediate()
        result.current.handleCreateNoteImmediate()
        result.current.handleCreateNoteImmediate()
        await flushAsyncWork()
      })
      await act(async () => {
        vi.advanceTimersByTime(RAPID_CREATE_NOTE_SETTLE_MS)
        await flushAsyncWork()
      })
      await act(async () => {
        vi.advanceTimersByTime(RAPID_CREATE_NOTE_SETTLE_MS)
        await flushAsyncWork()
      })

      expect(addEntry).toHaveBeenCalledTimes(3)
      expect(vi.mocked(invoke).mock.calls.filter(([command]) => command === 'create_note_content')).toHaveLength(3)
      expect(removeEntry).not.toHaveBeenCalled()
    })

  })

  describe('note open is read-only', () => {
    it('does not sync title or reload entry when reopening an identity-matched cached note', async () => {
      vi.mocked(isTauri).mockReturnValue(true)
      const entry = makeEntry({ path: '/test/vault/qa-test.md', filename: 'qa-test.md', title: 'Qa Test' })
      vi.mocked(invoke).mockImplementation(async (command) => {
        if (command === 'validate_note_content') return true
        if (command === 'get_note_content') return '# Qa Test\n'
        return null
      })

      const { result } = renderHook(() => useNoteActions(makeConfig([entry])))

      await act(async () => { await result.current.handleSelectNote(entry) })
      const callCountAfterFirstOpen = vi.mocked(invoke).mock.calls.length

      const desyncedEntry = { ...entry, title: 'Wrong Title Desynced' }
      await act(async () => { await result.current.handleSelectNote(desyncedEntry) })

      expect(vi.mocked(invoke)).toHaveBeenCalledTimes(callCountAfterFirstOpen)
      expect(vi.mocked(invoke).mock.calls).toEqual([
        ['get_note_content', { path: '/test/vault/qa-test.md' }],
      ])
      expect(result.current.tabs[0].entry.title).toBe('Qa Test')
    })
  })

  describe('rename note updates wikilinks', () => {
    it('handleRenameNote passes entry title as old_title to rename_note', async () => {
      const entry = makeEntry({
        path: '/test/vault/weekly-review.md',
        filename: 'weekly-review.md',
        title: 'Weekly Review',
      })
      const replaceEntry = vi.fn()
      const config = makeConfig([entry])
      config.replaceEntry = replaceEntry

      vi.mocked(mockInvoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'rename_note') return { new_path: '/test/vault/sprint-retro.md', updated_files: 2 }
        if (cmd === 'get_note_content') return '---\nIs A: Note\n---\n# Sprint Retro\n'
        return ''
      })

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        await result.current.handleRenameNote(
          '/test/vault/weekly-review.md',
          'Sprint Retro',
          '/test/vault',
          replaceEntry,
        )
      })

      expect(mockInvoke).toHaveBeenCalledWith('rename_note', expect.objectContaining({
        vault_path: '/test/vault',
        old_path: '/test/vault/weekly-review.md',
        new_title: 'Sprint Retro',
        old_title: 'Weekly Review',
      }))
      expect(setToastMessage).toHaveBeenCalledWith('Updated 2 notes')
    })

    it('handleRenameNote passes null old_title when entry not found', async () => {
      const config = makeConfig([])

      vi.mocked(mockInvoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'rename_note') return { new_path: '/test/vault/new.md', updated_files: 0 }
        if (cmd === 'get_note_content') return '# New\n'
        return ''
      })

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        await result.current.handleRenameNote(
          '/test/vault/old.md', 'New', '/test/vault', vi.fn(),
        )
      })

      expect(mockInvoke).toHaveBeenCalledWith('rename_note', expect.objectContaining({
        old_title: null,
      }))
    })

    it('handleUpdateFrontmatter triggers rename when title key is changed', async () => {
      const entry = makeEntry({
        path: '/test/vault/old-name.md',
        filename: 'old-name.md',
        title: 'Old Name',
      })
      const onPathRenamed = vi.fn()
      const replaceEntry = vi.fn()
      const config = makeConfig([entry])
      config.onPathRenamed = onPathRenamed
      config.replaceEntry = replaceEntry

      vi.mocked(mockInvoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'rename_note') return { new_path: '/test/vault/new-name.md', updated_files: 1 }
        if (cmd === 'get_note_content') return '---\ntitle: New Name\n---\n# New Name\n'
        return ''
      })

      const { result } = renderHook(() => useNoteActions(config))

      // Open a tab for the entry so the rename can find it via tabsRef
      await act(async () => { result.current.handleSelectNote(entry) })

      await act(async () => {
        await result.current.handleUpdateFrontmatter('/test/vault/old-name.md', 'title', 'New Name')
      })

      expect(mockInvoke).toHaveBeenCalledWith('rename_note', expect.objectContaining({
        old_path: '/test/vault/old-name.md',
        new_title: 'New Name',
        old_title: 'Old Name',
      }))
      expect(replaceEntry).toHaveBeenCalledWith(
        '/test/vault/old-name.md',
        expect.objectContaining({ path: '/test/vault/new-name.md', title: 'New Name' }),
      )
      expect(onPathRenamed).toHaveBeenCalledWith('/test/vault/old-name.md', '/test/vault/new-name.md')
    })

    it('routes undoable frontmatter changes to the renamed note path', async () => {
      const oldPath = '/test/vault/old-name.md'
      const newPath = '/test/vault/new-name.md'
      const entry = makeEntry({
        path: oldPath,
        filename: 'old-name.md',
        title: 'Old Name',
        noteWidth: 'normal',
      })
      const config = makeConfig([entry])
      config.onPathRenamed = vi.fn()
      config.replaceEntry = vi.fn()

      vi.mocked(mockInvoke).mockImplementation(async (cmd: string) => {
        if (cmd === 'rename_note') return { new_path: newPath, updated_files: 1 }
        if (cmd === 'get_note_content') return '---\ntitle: New Name\n_width: wide\n---\n# New Name\n'
        if (cmd === 'save_note_content') return undefined
        return ''
      })

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => { result.current.handleSelectNote(entry) })
      await act(async () => {
        await result.current.handleUpdateFrontmatter(oldPath, '_width', 'wide')
      })
      await act(async () => {
        await result.current.handleRenameNote(oldPath, 'New Name', '/test/vault', config.replaceEntry!)
      })
      vi.mocked(mockInvoke).mockClear()

      await act(async () => {
        await result.current.handleUndo()
      })

      const savePathsAfterUndo = savedNoteContentPaths()

      expect(savePathsAfterUndo).toContain(newPath)
      expect(savePathsAfterUndo).not.toContain(oldPath)
      expect(updateEntry).toHaveBeenCalledWith(newPath, expect.objectContaining({ noteWidth: 'normal' }))

      vi.mocked(mockInvoke).mockClear()
      vi.mocked(updateEntry).mockClear()

      await act(async () => {
        await result.current.handleRedo()
      })

      const savePathsAfterRedo = savedNoteContentPaths()

      expect(savePathsAfterRedo).toContain(newPath)
      expect(savePathsAfterRedo).not.toContain(oldPath)
      expect(updateEntry).toHaveBeenCalledWith(newPath, expect.objectContaining({ noteWidth: 'wide' }))
    })

    it('handleUpdateFrontmatter does not trigger rename for non-title keys', async () => {
      const config = makeConfig()
      vi.mocked(mockInvoke).mockResolvedValue('')

      const { result } = renderHook(() => useNoteActions(config))

      await act(async () => {
        await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
      })

      expect(mockInvoke).not.toHaveBeenCalledWith('rename_note', expect.anything())
    })
  })
})
