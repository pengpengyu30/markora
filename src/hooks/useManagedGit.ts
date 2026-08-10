import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { GitWorkspaceInfo } from '../types'

export type ManagedGitMode = 'checking' | 'managed' | 'readOnly' | 'unavailable'

interface ManagedGitState {
  mode: ManagedGitMode
  refresh: () => Promise<ManagedGitMode>
}

type DetectedGitMode = Exclude<ManagedGitMode, 'checking'>

function modeFromWorkspace(info: GitWorkspaceInfo | null | undefined): DetectedGitMode {
  if (info?.mode === 'managed') return 'managed'
  if (info?.mode === 'readOnly') return 'readOnly'
  return 'unavailable'
}

async function ensureWorkspace(vaultPath: string): Promise<GitWorkspaceInfo> {
  return isTauri()
    ? invoke<GitWorkspaceInfo>('ensure_git_repository', { vaultPath })
    : mockInvoke<GitWorkspaceInfo>('ensure_git_repository', { vaultPath })
}

export function useManagedGit(vaultPath: string, enabled = true): ManagedGitState {
  const detectionKey = enabled && vaultPath.trim() ? vaultPath : ''
  const [detection, setDetection] = useState<{ key: string; mode: DetectedGitMode }>({
    key: '',
    mode: 'unavailable',
  })
  const mode: ManagedGitMode = !detectionKey
    ? 'unavailable'
    : detection.key === detectionKey
      ? detection.mode
      : 'checking'

  const refresh = useCallback(async () => {
    if (!detectionKey) {
      setDetection({ key: '', mode: 'unavailable' })
      return 'unavailable' as const
    }

    setDetection({ key: '', mode: 'unavailable' })
    try {
      const nextMode = modeFromWorkspace(await ensureWorkspace(detectionKey))
      setDetection({ key: detectionKey, mode: nextMode })
      return nextMode
    } catch (error) {
      console.warn('[git] workspace detection unavailable:', error)
      setDetection({ key: detectionKey, mode: 'unavailable' })
      return 'unavailable' as const
    }
  }, [detectionKey])

  useEffect(() => {
    let cancelled = false
    if (!detectionKey) return () => { cancelled = true }

    void ensureWorkspace(detectionKey)
      .then((info) => {
        if (!cancelled) setDetection({ key: detectionKey, mode: modeFromWorkspace(info) })
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('[git] workspace detection unavailable:', error)
        setDetection({ key: detectionKey, mode: 'unavailable' })
      })

    return () => { cancelled = true }
  }, [detectionKey])

  return { mode, refresh }
}
