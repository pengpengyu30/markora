import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { useVaultLoader } from './useVaultLoader'

const backendInvokeFn = vi.fn()
let mockIsTauri = true

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => backendInvokeFn(...args),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => mockIsTauri,
  mockInvoke: (command: string, args?: Record<string, unknown>) => backendInvokeFn(command, args),
}))

function makeEntry(title = 'Recovered'): VaultEntry {
  return {
    path: '/vault/note/recovered.md',
    filename: 'recovered.md',
    title,
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe('useVaultLoader startup recovery', () => {
  beforeEach(() => {
    mockIsTauri = true
    backendInvokeFn.mockReset()
  })

  it('makes the active vault usable from a snapshot before reconciliation finishes', async () => {
    const reconciliation = createDeferred<VaultEntry[]>()
    backendInvokeFn.mockImplementation((command: string) => {
      if (command === 'read_vault_snapshot') return Promise.resolve([makeEntry()])
      if (command === 'list_vault') return reconciliation.promise
      if (command === 'list_vault_folders' || command === 'get_modified_files') return Promise.resolve([])
      return Promise.resolve(null)
    })

    const { result } = renderHook(() => useVaultLoader('/vault'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entries.map((entry) => entry.title)).toEqual(['Recovered'])

    reconciliation.resolve([makeEntry('Reconciled')])
    await waitFor(() => {
      expect(result.current.entries.map((entry) => entry.title)).toEqual(['Reconciled'])
    })
  })
})
