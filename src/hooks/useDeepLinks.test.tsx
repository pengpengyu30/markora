import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isTauri } from '../mock-tauri'
import { useDeepLinks } from './useDeepLinks'
import type { VaultEntry } from '../types'
import type { DeepLinkVault } from '../utils/deepLinks'

const { getCurrent, onOpenUrl } = vi.hoisted(() => ({
  getCurrent: vi.fn(),
  onOpenUrl: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-deep-link', () => ({
  getCurrent,
  onOpenUrl,
}))

const personalVault: DeepLinkVault = { label: 'Personal', path: '/personal' }
const teamVault: DeepLinkVault = { label: 'Team', path: '/team' }

function renderDeepLinks(overrides: Partial<Parameters<typeof useDeepLinks>[0]> = {}) {
  return renderHook(() => useDeepLinks({
    activeEntry: null,
    currentVaultPath: personalVault.path,
    enabled: true,
    entries: [] as VaultEntry[],
    isVaultContentLoading: false,
    onSelectNote: vi.fn(),
    onSwitchVault: vi.fn(),
    reloadVault: vi.fn().mockResolvedValue([]),
    setToastMessage: vi.fn(),
    vaultListLoaded: true,
    vaults: [personalVault],
    ...overrides,
  }))
}

describe('useDeepLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isTauri).mockReturnValue(false)
    getCurrent.mockResolvedValue(null)
    onOpenUrl.mockResolvedValue(vi.fn())
  })

  it('swallows stale native deep-link unlisten failures on unmount', async () => {
    vi.mocked(isTauri).mockReturnValue(true)
    const stopListening = vi.fn(() => {
      throw new TypeError("undefined is not an object (evaluating 'listeners[eventId].handlerId')")
    })
    onOpenUrl.mockResolvedValue(stopListening)

    const { unmount } = renderDeepLinks()

    await waitFor(() => expect(onOpenUrl).toHaveBeenCalledOnce())

    expect(() => unmount()).not.toThrow()
    await waitFor(() => expect(stopListening).toHaveBeenCalledOnce())
  })

  it('switches vaults when the deep link targets another vault', async () => {
    const switchVault = vi.fn()

    const { result } = renderDeepLinks({
      currentVaultPath: personalVault.path,
      onSwitchVault: switchVault,
      vaults: [personalVault, teamVault],
    })

    act(() => {
      result.current.openDeepLink('tolaria://team/notes/roadmap.md')
    })

    await waitFor(() => expect(switchVault).toHaveBeenCalledWith(teamVault.path), { timeout: 1_000 })
  })
})
