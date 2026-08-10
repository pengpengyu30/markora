import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useManagedGit } from './useManagedGit'

const mockInvoke = vi.fn()

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe('useManagedGit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not probe disabled vaults', () => {
    const { result } = renderHook(() => useManagedGit('/vault', false))

    expect(result.current.mode).toBe('unavailable')
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('reports a managed workspace after detection', async () => {
    mockInvoke.mockResolvedValue({
      vaultRoot: '/vault',
      gitRoot: '/vault',
      vaultPathspec: '',
      gitRootRelation: 'vault',
      mode: 'managed',
      resolutionFailure: null,
    })

    const { result } = renderHook(() => useManagedGit('/vault'))

    expect(result.current.mode).toBe('checking')
    await waitFor(() => expect(result.current.mode).toBe('managed'))
    expect(mockInvoke).toHaveBeenCalledWith('ensure_git_repository', { vaultPath: '/vault' })
  })

  it('preserves read-only workspace mode and refreshes it', async () => {
    mockInvoke.mockResolvedValue({
      vaultRoot: '/vault',
      gitRoot: '/parent',
      vaultPathspec: 'vault',
      gitRootRelation: 'parent',
      mode: 'readOnly',
      resolutionFailure: null,
    })

    const { result } = renderHook(() => useManagedGit('/vault'))
    await waitFor(() => expect(result.current.mode).toBe('readOnly'))

    mockInvoke.mockResolvedValueOnce({
      vaultRoot: '/vault',
      gitRoot: '/vault',
      vaultPathspec: '',
      gitRootRelation: 'vault',
      mode: 'managed',
      resolutionFailure: null,
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.mode).toBe('managed')
  })

  it('falls back to unavailable when workspace detection fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockInvoke.mockRejectedValue(new Error('probe failed'))

    const { result } = renderHook(() => useManagedGit('/vault'))

    await waitFor(() => expect(result.current.mode).toBe('unavailable'))
    expect(warnSpy).toHaveBeenCalledWith(
      '[git] workspace detection unavailable:',
      expect.any(Error),
    )
    warnSpy.mockRestore()
  })
})
