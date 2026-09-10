import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri } from '../mock-tauri'
import type { DetectedRename } from '../components/RenameDetectedBanner'

interface UseVaultRenameDetectionArgs {
  enabled?: boolean
  vaultPath: string
  reloadVault: () => unknown
  setToastMessage: (message: string) => void
}

interface UseVaultRenameDetectionResult {
  detectedRenames: DetectedRename[]
  handleUpdateWikilinks: () => Promise<void>
  handleDismissRenames: () => void
}

export function useVaultRenameDetection({
  enabled = true,
  vaultPath,
  reloadVault,
  setToastMessage,
}: UseVaultRenameDetectionArgs): UseVaultRenameDetectionResult {
  const [detectedRenames, setDetectedRenames] = useState<DetectedRename[]>([])

  useEffect(() => {
    if (!enabled || !isTauri() || !vaultPath) {
      // Reset stale detections when Git is disabled or the Project disappears.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize gate-driven UI state
      setDetectedRenames([])
      return
    }

    const handleFocus = () => {
      invoke<DetectedRename[]>('detect_renames', { args: { vaultPath } })
        .then((renames) => {
          if (renames.length > 0) setDetectedRenames(renames)
        })
        .catch((err) => console.warn('[vault] Git rename detection failed:', err))
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, vaultPath])

  const handleUpdateWikilinks = useCallback(async () => {
    if (!enabled || !isTauri()) return

    try {
      const count = await invoke<number>('update_wikilinks_for_renames', {
        args: { vaultPath, renames: detectedRenames },
      })
      setDetectedRenames([])
      reloadVault()
      setToastMessage(`Updated wikilinks in ${count} file${count !== 1 ? 's' : ''}`)
    } catch (err) {
      setToastMessage(`Failed to update wikilinks: ${err}`)
    }
  }, [detectedRenames, enabled, reloadVault, setToastMessage, vaultPath])

  const handleDismissRenames = useCallback(() => setDetectedRenames([]), [])

  return {
    detectedRenames,
    handleUpdateWikilinks,
    handleDismissRenames,
  }
}
