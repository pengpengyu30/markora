import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { VaultEntry, ModifiedFile, FolderNode } from '../types'
import { useVaultLoader, resolveNoteStatus } from './useVaultLoader'

const mockEntries: VaultEntry[] = [
  {
    path: '/vault/note/hello.md', filename: 'hello.md', title: 'Hello',
    isA: 'Note', aliases: [], belongsTo: [], relatedTo: [],
    status: 'Active',
    archived: false,
    modifiedAt: 1700000000, createdAt: 1700000000, fileSize: 100,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null, template: null, sort: null, outgoingLinks: [],
    sidebarLabel: null, view: null, visible: null, organized: false, favorite: false, favoriteIndex: null,
    listPropertiesDisplay: [], properties: {}, hasH1: false,
  },
]

const mockContent: Record<string, string> = {
  '/vault/note/hello.md': '---\ntitle: Hello\n---\n\n# Hello\n',
}

const mockModifiedFiles: ModifiedFile[] = [
  { path: '/vault/note/hello.md', relativePath: 'note/hello.md', status: 'modified' },
]

type MockCommandHandler = (args?: Record<string, unknown>) => unknown

const defaultMockHandlers: Record<string, MockCommandHandler> = {
  list_vault: () => mockEntries,
  reload_vault: () => mockEntries,
  get_all_content: () => mockContent,
  get_modified_files: () => mockModifiedFiles,
}

function defaultMockInvoke(cmd: string, args?: Record<string, unknown>) {
  const handler = Reflect.get(defaultMockHandlers, cmd) as ((args?: Record<string, unknown>) => unknown) | undefined
  return Promise.resolve(handler ? handler(args) : null)
}

let mockIsTauri = false
const backendInvokeFn = vi.fn(defaultMockInvoke)
const EMPTY_ARRAY_COMMANDS = new Set(['get_modified_files', 'list_vault_folders'])

function isVaultLoadCommand(cmd: string) {
  return cmd === 'list_vault' || cmd === 'reload_vault'
}

function buildVaultLoaderMock(options: {
  entries?: VaultEntry[]
  modifiedFiles?: ModifiedFile[]
} = {}) {
  const {
    entries = mockEntries,
    modifiedFiles = mockModifiedFiles,
  } = options

  return ((cmd: string, args?: Record<string, unknown>) => {
    if (isVaultLoadCommand(cmd)) return Promise.resolve(entries)
    if (cmd === 'get_modified_files') return Promise.resolve(modifiedFiles)
    if (cmd === 'list_vault_folders') return Promise.resolve([])
    return defaultMockInvoke(cmd, args)
  }) as typeof defaultMockInvoke
}

function entryAt(path: string, title: string, metadata: Partial<VaultEntry> = {}): VaultEntry {
  return {
    ...mockEntries[0],
    path,
    filename: path.split('/').pop() ?? 'note.md',
    title,
    ...metadata,
  }
}

function mockCachedStartupEntries(cachedPath: string, freshPath: string, metadata: Partial<VaultEntry> = {}) {
  backendInvokeFn.mockImplementation(((cmd: string) => {
    if (cmd === 'list_vault') return Promise.resolve([entryAt(cachedPath, 'Cached', metadata)])
    if (cmd === 'reload_vault') return Promise.resolve([entryAt(freshPath, 'Fresh', metadata)])
    if (EMPTY_ARRAY_COMMANDS.has(cmd)) return Promise.resolve([])
    return Promise.resolve(null)
  }) as typeof defaultMockInvoke)
}

function buildReloadVaultPathMock(loads: Record<string, Promise<VaultEntry[]>>) {
  return ((cmd: string, args?: Record<string, unknown>) => {
    const path = typeof args?.path === 'string' ? args.path : undefined
    if (cmd === 'reload_vault' && path) return loads[path] ?? Promise.resolve([])
    if (cmd === 'list_vault_folders') return Promise.resolve([])
    if (cmd === 'get_modified_files') return Promise.resolve([])
    return Promise.resolve(null)
  }) as typeof defaultMockInvoke
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => mockIsTauri,
  mockInvoke: (cmd: string, args?: Record<string, unknown>) => backendInvokeFn(cmd, args),
}))

async function waitForEntries(
  result: ReturnType<typeof renderHook<ReturnType<typeof useVaultLoader>, undefined>>['result'],
  length = 1,
) {
  await waitFor(() => {
    expect(result.current.entries).toHaveLength(length)
  })
}

async function waitForModifiedFiles(
  result: ReturnType<typeof renderHook<ReturnType<typeof useVaultLoader>, undefined>>['result'],
  length = 1,
) {
  await waitFor(() => {
    expect(result.current.modifiedFiles).toHaveLength(length)
  })
}

/** Render the vault loader hook and wait for initial data to load. */
async function renderVaultLoader() {
  const hook = renderHook(() => useVaultLoader('/vault'))
  await waitForEntries(hook.result)
  return hook
}

async function enableTauriMode() {
  mockIsTauri = true
  const tauri = await import('@tauri-apps/api/core')
  vi.mocked(tauri.invoke).mockImplementation((command: string, args?: Record<string, unknown>) =>
    backendInvokeFn(command, args),
  )
}

describe('useVaultLoader', () => {
  beforeEach(() => {
    mockIsTauri = false
    backendInvokeFn.mockReset()
    backendInvokeFn.mockImplementation(defaultMockInvoke)
    window.history.replaceState({}, '', '/')
  })

  it('loads entries on mount', async () => {
    const { result } = await renderVaultLoader()

    expect(result.current.entries[0].title).toBe('Hello')
  })

  it('retries an empty initial Tauri scan before settling on an empty vault', async () => {
    await enableTauriMode()
    let reloadCount = 0
    backendInvokeFn.mockImplementation(((cmd: string) => {
      if (cmd === 'list_vault') return Promise.resolve([])
      if (cmd === 'reload_vault') {
        reloadCount += 1
        return Promise.resolve(reloadCount === 1 ? [] : [entryAt('/vault/note/recovered.md', 'Recovered')])
      }
      if (cmd === 'get_modified_files' || cmd === 'list_vault_folders') return Promise.resolve([])
      return Promise.resolve(null)
    }) as typeof defaultMockInvoke)

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitForEntries(result)
    expect(result.current.entries[0].title).toBe('Recovered')
    expect(reloadCount).toBe(2)
  })

  it('normalizes missing entry metadata from vault load', async () => {
    backendInvokeFn.mockImplementation(((cmd: string) => {
      if (isVaultLoadCommand(cmd)) {
        return Promise.resolve([
          {
            path: '/vault/note/missing-title.md',
            filename: undefined,
            title: undefined,
            aliases: undefined,
            outgoingLinks: undefined,
            relationships: undefined,
            properties: undefined,
          },
        ])
      }
      if (cmd === 'get_modified_files') return Promise.resolve([])
      if (cmd === 'list_vault_folders') return Promise.resolve([])
      return Promise.resolve(null)
    }) as typeof defaultMockInvoke)

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitForEntries(result)
    expect(result.current.entries[0]).toMatchObject({
      path: '/vault/note/missing-title.md',
      filename: 'missing-title.md',
      title: 'missing-title',
      aliases: [],
      outgoingLinks: [],
      relationships: {},
      properties: {},
    })
  })

  it('reports initial vault loading until the note scan resolves', async () => {
    const entriesLoad = createDeferred<VaultEntry[]>()
    backendInvokeFn.mockImplementation(((cmd: string) => {
      if (isVaultLoadCommand(cmd)) return entriesLoad.promise
      if (cmd === 'get_modified_files') return Promise.resolve([])
      if (cmd === 'list_vault_folders') return Promise.resolve([])
      return Promise.resolve(null)
    }) as typeof defaultMockInvoke)

    const { result } = renderHook(() => useVaultLoader('/vault'))

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      entriesLoad.resolve(mockEntries)
      await entriesLoad.promise
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('loads folders while the initial note scan is still pending', async () => {
    const entriesLoad = createDeferred<VaultEntry[]>()
    const folders: FolderNode[] = [{ name: 'Projects', path: 'Projects', children: [] }]
    backendInvokeFn.mockImplementation(((cmd: string) => {
      if (isVaultLoadCommand(cmd)) return entriesLoad.promise
      if (cmd === 'get_modified_files') return Promise.resolve([])
      if (cmd === 'list_vault_folders') return Promise.resolve(folders)
      return Promise.resolve(null)
    }) as typeof defaultMockInvoke)

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitFor(() => {
      expect(result.current.folders).toEqual(folders)
    })
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      entriesLoad.resolve(mockEntries)
      await entriesLoad.promise
    })

    await waitFor(() => {
      expect(result.current.entries).toEqual(mockEntries)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('loads modified files on mount', async () => {
    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitForModifiedFiles(result)

    expect(result.current.modifiedFiles[0].status).toBe('modified')
  })

  it('does nothing until a real vault path exists', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useVaultLoader(''))

    await waitFor(() => {
      expect(result.current.entries).toEqual([])
      expect(result.current.modifiedFiles).toEqual([])
    })

    expect(backendInvokeFn).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('loads initial main-window vault entries from the cached listing in Tauri mode', async () => {
    await enableTauriMode()
    mockCachedStartupEntries('/vault/cached.md', '/vault/fresh.md', { isA: 'Type' })

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitFor(() => {
      expect(result.current.entries.map((entry) => entry.title)).toEqual(['Cached'])
    })
    const issuedCommands = backendInvokeFn.mock.calls.map(([command]) => command)
    expect(issuedCommands).toContain('list_vault')
    expect(issuedCommands).not.toContain('reload_vault')
  })

  it('marks the vault unavailable when the initial load finds a missing active vault', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    backendInvokeFn.mockImplementation(((cmd: string) => {
      if (isVaultLoadCommand(cmd)) return Promise.reject(new Error('No such file or directory'))
      if (cmd === 'check_vault_exists') return Promise.resolve(false)
      if (cmd === 'get_modified_files') return Promise.resolve(mockModifiedFiles)
      if (cmd === 'list_vault_folders') return Promise.reject(new Error('Active vault is not available'))
      return Promise.resolve(null)
    }) as typeof defaultMockInvoke)

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitFor(() => {
      expect(result.current.unavailableVaultPath).toBe('/vault')
    })
    expect(result.current.entries).toEqual([])
    expect(result.current.folders).toEqual([])
    expect(result.current.modifiedFiles).toEqual([])

    warnSpy.mockRestore()
  })

  it('ignores stale reload_vault results after the vault path changes', async () => {
    await enableTauriMode()
    const firstLoad = createDeferred<VaultEntry[]>()
    const secondLoad = createDeferred<VaultEntry[]>()

    backendInvokeFn.mockImplementation(buildReloadVaultPathMock({
      '/vault-a': firstLoad.promise,
      '/vault-b': secondLoad.promise,
    }))

    const { result, rerender } = renderHook(
      ({ path }) => useVaultLoader(path),
      { initialProps: { path: '/vault-a' } },
    )

    rerender({ path: '/vault-b' })

    await act(async () => {
      firstLoad.resolve([
        { ...mockEntries[0], path: '/vault-a/stale.md', filename: 'stale.md', title: 'Stale', isA: 'Type' },
      ])
      await firstLoad.promise
    })

    expect(result.current.entries).toEqual([])

    await act(async () => {
      secondLoad.resolve([
        { ...mockEntries[0], path: '/vault-b/journal.md', filename: 'journal.md', title: 'Journal', isA: 'Type' },
        { ...mockEntries[0], path: '/vault-b/2026-03-11.md', filename: '2026-03-11.md', title: 'March 11', isA: 'Journal' },
      ])
      await secondLoad.promise
    })

    await waitFor(() => {
      expect(result.current.entries.map((entry) => entry.title)).toEqual(['Journal', 'March 11'])
    })
  })

  describe('addEntry', () => {
    it('prepends new entry', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/new.md', filename: 'new.md', title: 'New Note' }

      act(() => { result.current.addEntry(newEntry) })

      expect(result.current.entries).toHaveLength(2)
      expect(result.current.entries[0].title).toBe('New Note')
    })

    it('ignores duplicate entry with same path', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/new.md', filename: 'new.md', title: 'New Note' }

      act(() => {
        result.current.addEntry(newEntry)
        result.current.addEntry(newEntry)
      })

      expect(result.current.entries).toHaveLength(2)
    })
  })

  describe('removeEntry', () => {
    it('removes entry by path', async () => {
      const { result } = await renderVaultLoader()

      act(() => { result.current.removeEntry('/vault/note/hello.md') })

      expect(result.current.entries).toHaveLength(0)
    })

    it('is a no-op for non-existent paths', async () => {
      const { result } = await renderVaultLoader()
      const entriesBefore = result.current.entries

      act(() => { result.current.removeEntry('/vault/note/nonexistent.md') })

      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries).toBe(entriesBefore)
    })
  })

  describe('removeEntries', () => {
    it('removes multiple entries in one state update', async () => {
      const { result } = await renderVaultLoader()
      const secondEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/second.md', filename: 'second.md', title: 'Second' }

      act(() => {
        result.current.addEntry(secondEntry)
        result.current.removeEntries(['/vault/note/hello.md', '/vault/note/second.md'])
      })

      expect(result.current.entries).toHaveLength(0)
    })

    it('preserves entries reference when none of the paths exist', async () => {
      const { result } = await renderVaultLoader()
      const entriesBefore = result.current.entries

      act(() => { result.current.removeEntries(['/vault/note/nonexistent.md']) })

      expect(result.current.entries).toBe(entriesBefore)
    })
  })

  describe('updateEntry', () => {
    it('patches an existing entry by path', async () => {
      const { result } = await renderVaultLoader()

      act(() => { result.current.updateEntry('/vault/note/hello.md', { archived: true, status: 'Done' }) })

      expect(result.current.entries[0].archived).toBe(true)
      expect(result.current.entries[0].status).toBe('Done')
    })

    it('preserves entries reference when path does not exist (no-op)', async () => {
      const { result } = await renderVaultLoader()
      const entriesBefore = result.current.entries

      act(() => { result.current.updateEntry('/vault/note/nonexistent.md', { archived: true }) })

      expect(result.current.entries).toBe(entriesBefore)
    })

    it('keeps entry metadata safe when a stale reload patch has undefined fields', async () => {
      const { result } = await renderVaultLoader()

      act(() => {
        result.current.updateEntry('/vault/note/hello.md', {
          title: undefined,
          filename: undefined,
          aliases: undefined,
          outgoingLinks: undefined,
          relationships: undefined,
          properties: undefined,
          snippet: undefined,
        } as unknown as Partial<VaultEntry>)
      })

      expect(result.current.entries[0]).toEqual(expect.objectContaining({
        title: 'hello',
        filename: 'hello.md',
        aliases: [],
        outgoingLinks: [],
        relationships: {},
        properties: {},
        snippet: '',
      }))
    })
  })

  describe('getNoteStatus', () => {
    it('returns clean for git-modified files', async () => {
      const { result } = renderHook(() => useVaultLoader('/vault'))

      await waitFor(() => {
        expect(result.current.modifiedFiles).toHaveLength(1)
      })

      expect(result.current.getNoteStatus('/vault/note/hello.md')).toBe('clean')
      expect(result.current.getNoteStatus('/vault/note/other.md')).toBe('clean')
    })

    it('returns clean for freshly added entries', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/brand-new.md', filename: 'brand-new.md', title: 'Brand New' }

      act(() => { result.current.addEntry(newEntry) })

      expect(result.current.getNoteStatus('/vault/note/brand-new.md')).toBe('clean')
    })

    it.each([
      {
        name: 'returns clean for git-untracked files (saved but not committed)',
        path: '/vault/note/brand-new.md',
        relativePath: 'note/brand-new.md',
        status: 'untracked',
      },
      {
        name: 'returns clean for git-added files (staged but not committed)',
        path: '/vault/note/staged.md',
        relativePath: 'note/staged.md',
        status: 'added',
      },
      {
        name: 'returns clean for git-modified files',
        path: '/vault/note/hello.md',
        relativePath: 'note/hello.md',
        status: 'modified',
      },
    ])('$name', async ({ path, relativePath, status }) => {
      backendInvokeFn.mockImplementation(buildVaultLoaderMock({
        modifiedFiles: [{ path, relativePath, status }],
      }))

      const { result } = renderHook(() => useVaultLoader('/vault'))

      await waitForModifiedFiles(result)

      expect(result.current.getNoteStatus(path)).toBe('clean')
    })

    it('does not derive a status from a newly added entry or git state', async () => {
      backendInvokeFn.mockImplementation(buildVaultLoaderMock({
        modifiedFiles: [
          { path: '/vault/note/new.md', relativePath: 'note/new.md', status: 'modified' },
        ],
      }))

      const { result } = renderHook(() => useVaultLoader('/vault'))

      await waitFor(() => {
        expect(result.current.modifiedFiles).toHaveLength(1)
      })

      const newEntry: VaultEntry = {
        ...mockEntries[0],
        path: '/vault/note/new.md',
        filename: 'new.md',
        title: 'New',
      }

      act(() => {
        result.current.addEntry(newEntry)
      })

      expect(result.current.getNoteStatus('/vault/note/new.md')).toBe('clean')
    })

    it('returns unsaved for paths in unsavedPaths', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/draft.md', filename: 'draft.md', title: 'Draft' }

      act(() => {
        result.current.addEntry(newEntry)
        result.current.trackUnsaved('/vault/note/draft.md')
      })

      expect(result.current.getNoteStatus('/vault/note/draft.md')).toBe('unsaved')
    })

    it('returns unsaved while a path is tracked as unsaved', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/draft.md', filename: 'draft.md', title: 'Draft' }

      act(() => {
        result.current.addEntry(newEntry)
        result.current.trackUnsaved('/vault/note/draft.md')
      })

      expect(result.current.getNoteStatus('/vault/note/draft.md')).toBe('unsaved')
    })

    it('clearUnsaved transitions from unsaved to clean', async () => {
      const { result } = await renderVaultLoader()
      const newEntry: VaultEntry = { ...mockEntries[0], path: '/vault/note/draft.md', filename: 'draft.md', title: 'Draft' }

      act(() => {
        result.current.addEntry(newEntry)
        result.current.trackUnsaved('/vault/note/draft.md')
      })

      expect(result.current.getNoteStatus('/vault/note/draft.md')).toBe('unsaved')

      act(() => { result.current.clearUnsaved('/vault/note/draft.md') })

      expect(result.current.getNoteStatus('/vault/note/draft.md')).toBe('clean')
    })

    it('keeps unsaved state stable when repeated edits do not change tracked paths', async () => {
      const { result } = await renderVaultLoader()
      const path = '/vault/note/draft.md'

      act(() => { result.current.trackUnsaved(path) })
      const trackedPaths = result.current.unsavedPaths

      act(() => { result.current.trackUnsaved(path) })

      expect(result.current.unsavedPaths).toBe(trackedPaths)

      act(() => { result.current.clearUnsaved(path) })
      const clearedPaths = result.current.unsavedPaths

      act(() => { result.current.clearUnsaved(path) })

      expect(result.current.unsavedPaths).toBe(clearedPaths)
    })

    it('tracks and clears pendingSave states separately from unsaved markers', async () => {
      const { result } = await renderVaultLoader()

      act(() => {
        result.current.addPendingSave('/vault/note/hello.md')
      })
      expect(result.current.getNoteStatus('/vault/note/hello.md')).toBe('pendingSave')

      act(() => {
        result.current.removePendingSave('/vault/note/hello.md')
      })
      expect(result.current.getNoteStatus('/vault/note/hello.md')).toBe('clean')
    })
  })

  describe('reloadFolders', () => {
    it('refreshes folder tree from backend', async () => {
      const folders = [{ name: 'projects', path: 'projects', children: [] }]
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'get_modified_files') return Promise.resolve([])
        if (cmd === 'list_vault_folders') return Promise.resolve(folders)
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      expect(result.current.folders).toEqual(folders)

      const updatedFolders = [...folders, { name: 'journal', path: 'journal', children: [] }]
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'list_vault_folders') return Promise.resolve(updatedFolders)
        return defaultMockInvoke(cmd)
      }) as typeof defaultMockInvoke)

      await act(async () => { await result.current.reloadFolders() })

      expect(result.current.folders).toEqual(updatedFolders)
    })

    it('returns an empty folder list when the refresh fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'get_modified_files') return Promise.resolve([])
        if (cmd === 'list_vault_folders') return Promise.reject(new Error('no folders'))
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = renderHook(() => useVaultLoader('/vault'))

      let folders: Array<{ name: string; path: string; children: [] }> = []
      await act(async () => {
        folders = await result.current.reloadFolders()
      })

      expect(folders).toEqual([])
      warnSpy.mockRestore()
    })
  })

  describe('loadModifiedFiles', () => {
    it('coalesces overlapping modified-file refreshes while git status is in flight', async () => {
      const firstStatus = createDeferred<ModifiedFile[]>()
      const secondStatus = createDeferred<ModifiedFile[]>()
      let statusCalls = 0
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        if (cmd === 'get_modified_files') {
          statusCalls += 1
          return statusCalls === 1 ? firstStatus.promise : secondStatus.promise
        }
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = renderHook(() => useVaultLoader('/vault'))
      await waitForEntries(result)

      await act(async () => {
        void result.current.loadModifiedFiles()
        void result.current.loadModifiedFiles()
        await Promise.resolve()
      })

      expect(statusCalls).toBe(1)

      await act(async () => {
        firstStatus.resolve([])
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(statusCalls).toBe(2)
      })

      await act(async () => {
        secondStatus.resolve(mockModifiedFiles)
        await Promise.resolve()
      })

      await waitForModifiedFiles(result)
    })

    it('refreshes modified files list', async () => {
      let statusCalls = 0
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        if (cmd === 'get_modified_files') {
          statusCalls += 1
          return Promise.resolve(statusCalls === 1 ? [] : mockModifiedFiles)
        }
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = renderHook(() => useVaultLoader('/vault'))
      await waitForEntries(result)
      await waitFor(() => {
        expect(statusCalls).toBe(1)
      })

      await act(async () => {
        await result.current.loadModifiedFiles()
      })

      await waitForModifiedFiles(result)
      expect(statusCalls).toBe(2)
    })

    it('falls back to an empty modified-file list when status cannot be loaded', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'get_modified_files') return Promise.reject('status unavailable')
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = renderHook(() => useVaultLoader('/vault'))

      await waitFor(() => {
        expect(result.current.modifiedFiles).toEqual([])
      })
      expect(warnSpy).toHaveBeenCalledWith('Failed to load modified files:', 'status unavailable')

      warnSpy.mockRestore()
    })
  })

  describe('replaceEntry', () => {
    it('replaces an entry path and metadata in place', async () => {
      const { result } = await renderVaultLoader()

      act(() => {
        result.current.replaceEntry('/vault/note/hello.md', {
          path: '/vault/note/renamed.md',
          filename: 'renamed.md',
          title: 'Renamed',
        })
      })

      expect(result.current.entries[0]).toEqual(expect.objectContaining({
        path: '/vault/note/renamed.md',
        filename: 'renamed.md',
        title: 'Renamed',
      }))
    })

    it('normalizes stale replacement metadata during reload-heavy note switching', async () => {
      const { result } = await renderVaultLoader()

      act(() => {
        result.current.replaceEntry('/vault/note/hello.md', {
          path: '/vault/note/reloaded.md',
          title: undefined,
          filename: undefined,
          aliases: undefined,
          outgoingLinks: undefined,
          relationships: undefined,
          properties: undefined,
          snippet: undefined,
        } as unknown as Partial<VaultEntry> & { path: string })
      })

      expect(result.current.entries[0]).toEqual(expect.objectContaining({
        path: '/vault/note/reloaded.md',
        filename: 'reloaded.md',
        title: 'reloaded',
        aliases: [],
        outgoingLinks: [],
        relationships: {},
        properties: {},
        snippet: '',
      }))
    })

    it('preserves entries reference when the old path does not exist', async () => {
      const { result } = await renderVaultLoader()
      const entriesBefore = result.current.entries

      act(() => {
        result.current.replaceEntry('/vault/note/nonexistent.md', {
          path: '/vault/note/renamed.md',
          filename: 'renamed.md',
        })
      })

      expect(result.current.entries).toBe(entriesBefore)
    })
  })

  describe('reloadVault', () => {
    it('reports reload progress while reload_vault is pending', async () => {
      const reload = createDeferred<VaultEntry[]>()
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'list_vault') return Promise.resolve(mockEntries)
        if (cmd === 'reload_vault') return reload.promise
        if (cmd === 'get_modified_files') return Promise.resolve([])
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      let pendingReload: Promise<VaultEntry[]> | null = null
      act(() => {
        pendingReload = result.current.reloadVault()
      })

      expect(result.current.isReloading).toBe(true)

      await act(async () => {
        reload.resolve(mockEntries)
        await pendingReload!
      })

      expect(result.current.isReloading).toBe(false)
    })

    it('serializes overlapping vault reloads and runs one trailing reload', async () => {
      const firstReload = createDeferred<VaultEntry[]>()
      const secondReload = createDeferred<VaultEntry[]>()
      let reloadCalls = 0
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'list_vault') return Promise.resolve(mockEntries)
        if (cmd === 'reload_vault') {
          reloadCalls += 1
          return reloadCalls === 1 ? firstReload.promise : secondReload.promise
        }
        if (cmd === 'get_modified_files' || cmd === 'list_vault_folders') return Promise.resolve([])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      let firstReloadPromise: Promise<VaultEntry[]> | undefined
      await act(async () => {
        firstReloadPromise = result.current.reloadVault()
        void result.current.reloadVault()
        await Promise.resolve()
      })

      expect(reloadCalls).toBe(1)

      await act(async () => {
        firstReload.resolve([mockEntries[0]])
        await firstReloadPromise
      })

      await waitFor(() => {
        expect(reloadCalls).toBe(2)
      })

      await act(async () => {
        secondReload.resolve([
          { ...mockEntries[0], path: '/vault/note/trailing.md', filename: 'trailing.md', title: 'Trailing' },
        ])
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(result.current.entries[0]?.title).toBe('Trailing')
      })
    })

    it('refreshes entries from reload_vault and reloads modified files', async () => {
      const reloadedEntry = {
        ...mockEntries[0],
        path: '/vault/note/reloaded.md',
        filename: 'reloaded.md',
        title: 'Reloaded',
      }

      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'list_vault') return Promise.resolve(mockEntries)
        if (cmd === 'reload_vault') return Promise.resolve([reloadedEntry])
        if (cmd === 'get_modified_files') return Promise.resolve([])
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      let entries: VaultEntry[] = []
      await act(async () => {
        entries = await result.current.reloadVault()
      })

      expect(entries.map((entry) => entry.title)).toEqual(['Reloaded'])
      expect(result.current.entries.map((entry) => entry.title)).toEqual(['Reloaded'])
      expect(result.current.modifiedFiles).toEqual([])
    })

    it('returns an empty list when reloading the vault fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'reload_vault') return Promise.reject(new Error('reload failed'))
        if (isVaultLoadCommand(cmd)) return Promise.resolve(mockEntries)
        if (cmd === 'get_modified_files') return Promise.resolve([])
        if (cmd === 'list_vault_folders') return Promise.resolve([])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      let entries: VaultEntry[] = []
      await act(async () => {
        entries = await result.current.reloadVault()
      })

      expect(entries).toEqual([])
      expect(result.current.entries).toEqual(mockEntries)
      warnSpy.mockRestore()
    })

    it('clears stale entries and marks the vault unavailable when the active vault disappears', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      backendInvokeFn.mockImplementation(((cmd: string) => {
        if (cmd === 'list_vault') return Promise.resolve(mockEntries)
        if (cmd === 'reload_vault') return Promise.reject(new Error('No such file or directory'))
        if (cmd === 'check_vault_exists') return Promise.resolve(false)
        if (cmd === 'get_modified_files') return Promise.resolve(mockModifiedFiles)
        if (cmd === 'list_vault_folders') return Promise.resolve([{ name: 'note', path: '/vault/note', children: [] }])
        return Promise.resolve(null)
      }) as typeof defaultMockInvoke)

      const { result } = await renderVaultLoader()

      let entries: VaultEntry[] = []
      await act(async () => {
        entries = await result.current.reloadVault()
      })

      expect(entries).toEqual([])
      expect(result.current.entries).toEqual([])
      expect(result.current.folders).toEqual([])
      expect(result.current.modifiedFiles).toEqual([])
      expect(result.current.unavailableVaultPath).toBe('/vault')
      warnSpy.mockRestore()
    })
  })

})

describe('resolveNoteStatus', () => {
  const status = (
    path: string,
    pendingSavePaths?: Set<string>,
    unsavedPaths?: Set<string>,
  ) => resolveNoteStatus({ path, pendingSavePaths, unsavedPaths })

  it('returns clean when no transient status is tracked', () => {
    expect(status('/vault/x.md')).toBe('clean')
  })

  it('returns pendingSave while a disk write is in flight', () => {
    const pendingSave = new Set(['/vault/x.md'])
    expect(status('/vault/x.md', pendingSave)).toBe('pendingSave')
  })

  it('returns unsaved while local editor content is unflushed', () => {
    const unsaved = new Set(['/vault/x.md'])
    expect(status('/vault/x.md', undefined, unsaved)).toBe('unsaved')
  })

  it('gives unsaved content priority over pendingSave', () => {
    const unsaved = new Set(['/vault/x.md'])
    const pendingSave = new Set(['/vault/x.md'])
    expect(status('/vault/x.md', pendingSave, unsaved)).toBe('unsaved')
  })
})
