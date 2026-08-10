import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import {
  buildNewEntry,
  buildNoteContent,
  entryMatchesTarget,
  planNewNoteCreation,
  resolveNewNote,
  slugify,
  RAPID_CREATE_NOTE_SETTLE_MS,
  useNoteCreation,
} from './useNoteCreation'
import type { NoteCreationConfig } from './useNoteCreation'
import { requestCreateNoteInFolder } from './noteCreationRequests'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(() => false),
  addMockEntry: vi.fn(),
  updateMockContent: vi.fn(),
  trackMockChange: vi.fn(),
  mockInvoke: vi.fn().mockResolvedValue(''),
}))

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/test.md',
  filename: 'test.md',
  title: 'Test Note',
  isA: null,
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
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

describe('slugify', () => {
  it('converts text to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('preserves unicode letters and avoids empty filenames', () => {
    expect(slugify('停智慧')).toBe('停智慧')
    expect(slugify('')).toBe('untitled')
    expect(slugify('+++')).not.toBe('')
  })
})

describe('buildNewEntry', () => {
  it('creates a plain note entry without type or status metadata', () => {
    const entry = buildNewEntry({ path: '/vault/my-note.md', slug: 'my-note', title: 'My Note' })

    expect(entry).toMatchObject({
      path: '/vault/my-note.md',
      filename: 'my-note.md',
      title: 'My Note',
      isA: null,
      status: null,
      archived: false,
      favorite: false,
      organized: false,
    })
  })
})

describe('entryMatchesTarget', () => {
  it('matches titles, aliases, filename stems, and pipe labels', () => {
    const entry = makeEntry({
      path: '/vault/project/alpha.md',
      filename: 'alpha.md',
      title: 'Alpha',
      aliases: ['A'],
    })

    expect(entryMatchesTarget({ entry, target: 'alpha' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'a' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'project/alpha' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'project/alpha|Alpha Project' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'missing' })).toBe(false)
  })
})

describe('buildNoteContent', () => {
  it('creates an empty Markdown body without frontmatter', () => {
    expect(buildNoteContent({})).toBe('')
  })

  it('adds the blank H1 used by immediate note creation', () => {
    expect(buildNoteContent({ initialEmptyHeading: true })).toBe('\n# \n\n')
  })

})

describe('resolveNewNote', () => {
  it('creates a root note with no frontmatter', () => {
    const { entry, content } = resolveNewNote({ title: 'My Project', vaultPath: '/vault' })

    expect(entry.path).toBe('/vault/my-project.md')
    expect(entry.isA).toBeNull()
    expect(entry.status).toBeNull()
    expect(content).toBe('')
  })

  it('uses an available configured default workspace', () => {
    const { entry } = resolveNewNote({
      title: 'Team Brief',
      vaultPath: '/personal',
      defaultWorkspacePath: '/team',
      vaults: [
        { label: 'Personal', path: '/personal', alias: 'personal', available: true, mounted: true },
        { label: 'Team Notes', path: '/team', alias: 'team', available: true, mounted: true },
      ],
    })

    expect(entry.path).toBe('/team/team-brief.md')
    expect(entry.workspace).toMatchObject({ alias: 'team', defaultForNewNotes: true })
  })

  it('falls back to the active workspace when the default is unavailable', () => {
    const { entry } = resolveNewNote({
      title: 'Local Brief',
      vaultPath: '/personal',
      defaultWorkspacePath: '/team',
      vaults: [
        { label: 'Personal', path: '/personal', alias: 'personal', available: true, mounted: true },
        { label: 'Team Notes', path: '/team', alias: 'team', available: false, mounted: true },
      ],
    })

    expect(entry.path).toBe('/personal/local-brief.md')
    expect(entry.workspace?.alias).toBe('personal')
  })
})

describe('planNewNoteCreation', () => {
  it('blocks a note when its normalized path already exists', () => {
    const plan = planNewNoteCreation({
      entries: [makeEntry({ path: '/private/tmp/vault/briefing.md', filename: 'briefing.md' })],
      title: 'Briefing',
      vaultPath: '/tmp/vault',
    })

    expect(plan).toEqual({
      status: 'blocked',
      message: 'Cannot create note "Briefing" because briefing.md already exists',
    })
  })
})

describe('useNoteCreation hook', () => {
  const addEntry = vi.fn()
  const removeEntry = vi.fn()
  const setToastMessage = vi.fn()
  const openTabWithContent = vi.fn()
  const makeConfig = (entries: VaultEntry[] = []): NoteCreationConfig => ({
    addEntry,
    removeEntry,
    entries,
    setToastMessage,
    vaultPath: '/test/vault',
  })

  const tabDeps = { openTabWithContent }
  const flushImmediateCreate = async () => {
    await Promise.resolve()
    await Promise.resolve()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isTauri).mockReturnValue(false)
    vi.mocked(invoke).mockReset()
    vi.useRealTimers()
  })

  it('creates a named plain Markdown note and opens its tab', async () => {
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      await result.current.handleCreateNote('Test Note')
    })

    expect(addEntry).toHaveBeenCalledTimes(1)
    expect(openTabWithContent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Note',
      isA: null,
      status: null,
    }), '')
  })

  it('creates an immediate note with a timestamp-based title and blank Markdown heading', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      result.current.handleCreateNoteImmediate()
      await flushImmediateCreate()
    })

    expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Untitled Note 1700000000',
      filename: 'untitled-note-1700000000.md',
      isA: null,
    }))
    expect(openTabWithContent).toHaveBeenCalledWith(expect.anything(), '\n# \n\n')
    vi.restoreAllMocks()
  })

  it('can create an immediate note in a nested folder', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockResolvedValueOnce(undefined)
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      result.current.handleCreateNoteImmediate({
        creationPath: 'folder_header',
        folderPath: 'Projects/2026 Planning',
        vaultPath: '/Users/luca/Team',
      })
      await flushImmediateCreate()
    })

    const createdPath = '/Users/luca/Team/Projects/2026 Planning/untitled-note-1700000000.md'
    expect(invoke).toHaveBeenCalledWith('create_note_content', {
      path: createdPath,
      content: '\n# \n\n',
      vaultPath: '/Users/luca/Team',
    })
    expect(addEntry).toHaveBeenCalledWith(expect.objectContaining({
      path: createdPath,
      workspace: expect.objectContaining({ path: '/Users/luca/Team' }),
    }))
    vi.restoreAllMocks()
  })

  it('handles folder creation requests from the folder tree event bridge', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockResolvedValueOnce(undefined)
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      requestCreateNoteInFolder('Projects/2026 Planning', '/Users/luca/Team')
      await flushImmediateCreate()
    })

    expect(openTabWithContent).toHaveBeenCalledWith(expect.objectContaining({
      path: '/Users/luca/Team/Projects/2026 Planning/untitled-note-1700000000.md',
    }), '\n# \n\n')
    vi.restoreAllMocks()
  })

  it('avoids filename collisions during rapid creation', async () => {
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      result.current.handleCreateNoteImmediate()
      result.current.handleCreateNoteImmediate()
      await flushImmediateCreate()
    })
    await act(async () => {
      vi.advanceTimersByTime(RAPID_CREATE_NOTE_SETTLE_MS)
      await flushImmediateCreate()
    })

    expect(addEntry).toHaveBeenCalledTimes(2)
    expect(addEntry.mock.calls.map(([entry]: [VaultEntry]) => entry.filename)).toEqual([
      'untitled-note-1700000000.md',
      'untitled-note-1700000000-2.md',
    ])
    vi.restoreAllMocks()
  })

  it('persists before opening an immediate note', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      result.current.handleCreateNoteImmediate()
      await flushImmediateCreate()
    })

    expect(invoke).toHaveBeenCalledWith('create_note_content', expect.objectContaining({
      content: '\n# \n\n',
    }))
    expect(invoke.mock.invocationCallOrder[0]).toBeLessThan(openTabWithContent.mock.invocationCallOrder[0])
  })

  it('does not open an immediate note when disk creation fails', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'))
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      result.current.handleCreateNoteImmediate()
      await flushImmediateCreate()
    })

    expect(addEntry).not.toHaveBeenCalled()
    expect(openTabWithContent).not.toHaveBeenCalled()
    expect(setToastMessage).toHaveBeenCalledWith('Failed to create note — disk write error')
  })

  it('reverts a named note when disk creation fails', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    vi.mocked(invoke).mockRejectedValueOnce(new Error('disk full'))
    const { result } = renderHook(() => useNoteCreation(makeConfig(), tabDeps))

    await act(async () => {
      await result.current.handleCreateNote('Failing Note')
    })

    expect(removeEntry).toHaveBeenCalledWith(expect.stringContaining('failing-note.md'))
    expect(setToastMessage).toHaveBeenCalledWith('Failed to create note — disk write error')
  })
})
