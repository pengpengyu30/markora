import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderNode, VaultEntry } from '../types'
import { trackNoteRetargeted } from '../lib/productAnalytics'
import { useNoteRetargeting } from './useNoteRetargeting'

vi.mock('../lib/productAnalytics', () => ({
  trackNoteRetargeted: vi.fn(),
}))

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/notes/alpha.md',
  filename: 'alpha.md',
  title: 'Alpha',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: 'Active',
  archived: false,
  modifiedAt: 1700000000,
  createdAt: 1700000000,
  fileSize: 10,
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
  ...overrides,
})

const folders: FolderNode[] = [
  { name: 'notes', path: 'notes', children: [] },
  { name: 'projects', path: 'projects', children: [] },
]

describe('useNoteRetargeting', () => {
  const moveNoteToFolder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderUseNoteRetargeting(
    entries: VaultEntry[] = [makeEntry()],
    vaultPath = '/vault',
  ) {
    return renderHook(() => useNoteRetargeting({
      entries,
      folders,
      vaultPath,
      moveNoteToFolder,
    }))
  }

  it('moves the note into another folder', async () => {
    moveNoteToFolder.mockResolvedValue({ new_path: '/vault/projects/alpha.md' })
    const { result } = renderUseNoteRetargeting()

    await act(async () => {
      await result.current.moveIntoFolder('/vault/notes/alpha.md', 'projects')
    })

    expect(moveNoteToFolder).toHaveBeenCalledWith(
      '/vault/notes/alpha.md',
      'projects',
      '/vault',
      expect.any(Function),
    )
    expect(trackNoteRetargeted).toHaveBeenCalledWith({
      targetKind: 'folder',
      folderDestination: 'folder',
    })
  })

  it('moves a nested note back to the vault root', async () => {
    const nestedEntry = makeEntry({ path: '/vault/notes/alpha.md' })
    moveNoteToFolder.mockResolvedValue({ new_path: '/vault/alpha.md' })
    const { result } = renderUseNoteRetargeting(
      [nestedEntry],
    )

    expect(result.current.canDropNoteOnFolder('/vault/notes/alpha.md', '')).toBe(true)

    await act(async () => {
      await result.current.moveIntoFolder('/vault/notes/alpha.md', '')
    })

    expect(moveNoteToFolder).toHaveBeenCalledWith(
      '/vault/notes/alpha.md',
      '',
      '/vault',
      expect.any(Function),
    )
    expect(trackNoteRetargeted).toHaveBeenCalledWith({
      targetKind: 'folder',
      folderDestination: 'root',
    })
  })

  it('uses normalized paths when checking a Windows folder destination', async () => {
    const windowsEntry = makeEntry({
      path: 'C:\\vault\\projects\\alpha.md',
      filename: 'alpha.md',
    })
    moveNoteToFolder.mockResolvedValue({ new_path: 'C:\\vault\\projects\\alpha.md' })
    const { result } = renderUseNoteRetargeting(
      [windowsEntry],
      'C:\\vault',
    )

    expect(result.current.canDropNoteOnFolder('C:\\vault\\projects\\alpha.md', 'projects')).toBe(false)
    expect(result.current.canDropNoteOnFolder('C:\\vault\\projects\\alpha.md', '\\archive\\')).toBe(true)

    await act(async () => {
      await result.current.moveIntoFolder('C:\\vault\\projects\\alpha.md', '\\archive\\')
    })

    expect(moveNoteToFolder).toHaveBeenCalledWith(
      'C:\\vault\\projects\\alpha.md',
      'archive',
      'C:\\vault',
      expect.any(Function),
    )
  })
})
