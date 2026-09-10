import { useState, useCallback, useEffect } from 'react'
import { getVaultConfig, updateVaultConfigField, subscribeVaultConfig } from '../utils/vaultConfigStore'

interface UseRawModeParams {
  activeTabPath: string | null
  /** Optional Project root used to isolate explicit Preview choices. */
  projectPath?: string
  /** Flush pending WYSIWYG edits to disk before entering raw mode. */
  onFlushPending?: () => Promise<boolean>
  /** Called synchronously before raw mode is deactivated, so the caller can
   *  flush any debounced raw-editor content into tab state. */
  onBeforeRawEnd?: () => void
}

export const PROJECT_EDITOR_MODE_STORAGE_KEY = 'markora:editor-mode-by-project'

function isRawEditorMode(editorMode: string | null): boolean {
  return editorMode === 'raw'
}

type PersistedEditorMode = 'raw' | 'preview'

function normalizedProjectPath(projectPath?: string): string | null {
  const normalized = projectPath?.trim() ?? ''
  return normalized ? normalized : null
}

function readProjectEditorModes(): Record<string, PersistedEditorMode> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(PROJECT_EDITOR_MODE_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value === 'raw' || value === 'preview'),
    ) as Record<string, PersistedEditorMode>
  } catch {
    return {}
  }
}

function saveProjectEditorMode(projectPath: string, mode: PersistedEditorMode): void {
  if (typeof window === 'undefined') return

  try {
    const modes = readProjectEditorModes()
    modes[projectPath] = mode
    window.localStorage.setItem(PROJECT_EDITOR_MODE_STORAGE_KEY, JSON.stringify(modes))
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

function loadEditorMode(projectPath: string | null): boolean {
  if (projectPath) {
    // A Project without an explicit local choice always opens in rich preview. The
    // old editor_mode config is intentionally ignored because it was global.
    return readProjectEditorModes()[projectPath] === 'raw'
  }

  // Rich preview is the default for existing Markdown files. Only an explicit
  // raw preference opts into the source editor.
  return isRawEditorMode(getVaultConfig().editor_mode)
}

/**
 * Manages raw editor mode state.
 * Explicit mode choices persist per Project and remain stable across tab switches.
 */
export function useRawMode({ activeTabPath, projectPath, onFlushPending, onBeforeRawEnd }: UseRawModeParams) {
  const projectKey = normalizedProjectPath(projectPath)
  const [modeState, setModeState] = useState(() => ({
    projectKey,
    rawEnabled: loadEditorMode(projectKey),
  }))
  const rawEnabled = modeState.projectKey === projectKey
    ? modeState.rawEnabled
    : loadEditorMode(projectKey)

  // Re-sync the legacy no-Project preference when vault config becomes available.
  useEffect(() => {
    if (projectKey) return

    return subscribeVaultConfig(() => {
      const stored = getVaultConfig().editor_mode
      setModeState({
        projectKey: null,
        rawEnabled: isRawEditorMode(stored),
      })
    })
  }, [projectKey])

  const rawMode = rawEnabled && activeTabPath !== null

  const handleToggleRaw = useCallback(async () => {
    if (rawEnabled) {
      onBeforeRawEnd?.()
      setModeState({ projectKey, rawEnabled: false })
      if (projectKey) saveProjectEditorMode(projectKey, 'preview')
      else updateVaultConfigField('editor_mode', 'preview')
    } else {
      await onFlushPending?.()
      setModeState({ projectKey, rawEnabled: true })
      if (projectKey) saveProjectEditorMode(projectKey, 'raw')
      else updateVaultConfigField('editor_mode', 'raw')
    }
  }, [onBeforeRawEnd, onFlushPending, projectKey, rawEnabled])

  return { rawMode, handleToggleRaw }
}
