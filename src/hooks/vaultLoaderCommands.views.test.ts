import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadMountedVaultFolders } from './vaultLoaderCommands'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (command: string, args?: Record<string, unknown>) => mockInvoke(command, args),
}))

describe('loadMountedVaultFolders', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('loads folders from the active workspace when folder vaults omit it', async () => {
    mockInvoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
      if (command !== 'list_vault_folders') return Promise.resolve([])

      const path = String(args?.path)
      if (path === '/active') {
        return Promise.resolve([{ name: 'active-folder', path: 'active-folder', children: [] }])
      }
      if (path === '/mounted') {
        return Promise.resolve([{ name: 'mounted-folder', path: 'mounted-folder', children: [] }])
      }
      throw new Error(`Unexpected path ${path}`)
    })

    const folders = await loadMountedVaultFolders({
      defaultWorkspacePath: '/mounted',
      vaultPath: '/active',
      vaults: [
        { label: 'Mounted', path: '/mounted', alias: 'mounted', mounted: true, available: true },
      ],
    })

    expect(folders).toEqual([
      {
        name: 'Mounted',
        path: '',
        rootPath: '/mounted',
        children: [{ name: 'mounted-folder', path: 'mounted-folder', rootPath: '/mounted', children: [] }],
      },
      {
        name: 'active',
        path: '',
        rootPath: '/active',
        children: [{ name: 'active-folder', path: 'active-folder', rootPath: '/active', children: [] }],
      },
    ])
  })

  it('does not duplicate the active workspace when folder vaults already include it', async () => {
    mockInvoke.mockImplementation((command: string, args?: Record<string, unknown>) => {
      if (command !== 'list_vault_folders') return Promise.resolve([])
      return Promise.resolve([{ name: `${String(args?.path)}-folder`, path: 'folder', children: [] }])
    })

    const folders = await loadMountedVaultFolders({
      defaultWorkspacePath: '/active',
      vaultPath: '/active',
      vaults: [
        { label: 'Active', path: '/active', alias: 'active', mounted: true, available: true },
      ],
    })

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(folders).toEqual([{ name: '/active-folder', path: 'folder', children: [] }])
  })
})
