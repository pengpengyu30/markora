import { useCallback, useEffect, type MutableRefObject } from 'react'
import type { VaultEntry } from '../types'
import type { FrontmatterValue } from '../types'
import { cacheNoteContent, useTabManagement } from './useTabManagement'
import {
  GITIGNORED_VISIBILITY_APPLIED_EVENT,
  type GitignoredVisibilityAppliedEvent,
} from '../lib/gitignoredVisibilityEvents'
import { resolveEntry } from '../utils/wikilink'
import { useNoteCreation } from './useNoteCreation'
import {
  useNoteRename,
  performRename,
  loadNoteContent,
  renameToastMessage,
  reloadTabsAfterRename,
  reloadVaultAfterRename,
} from './useNoteRename'
import { isWritableFrontmatterKey, runFrontmatterAndApply, type FrontmatterOpOptions } from './frontmatterOps'
import { findByNotePath, notePathFilename, notePathsMatch } from '../utils/notePathIdentity'
import type { VaultOption } from '../components/status-bar/types'

export interface NoteActionsConfig {
  addEntry: (entry: VaultEntry) => void
  removeEntry: (path: string) => void
  entries: VaultEntry[]
  flushBeforeNoteSwitch?: (path: string) => Promise<void>
  flushBeforeNoteMutation?: (path: string) => Promise<void>
  reloadVault?: () => Promise<unknown>
  setToastMessage: (msg: string | null) => void
  updateEntry: (path: string, patch: Partial<VaultEntry>) => void
  vaultPath: string
  defaultWorkspacePath?: string | null
  vaults?: readonly VaultOption[]
  addPendingSave?: (path: string) => void
  removePendingSave?: (path: string) => void
  trackUnsaved?: (path: string) => void
  clearUnsaved?: (path: string) => void
  unsavedPaths?: Set<string>
  markContentPending?: (path: string, content: string) => void
  onNewNotePersisted?: (path: string) => void
  replaceEntry?: (oldPath: string, patch: Partial<VaultEntry> & { path: string }) => void
  onPathRenamed?: (oldPath: string, newPath: string) => void
  /** Called when note loading proves the active vault path is no longer usable. */
  onMissingActiveVault?: (entry: VaultEntry, error: unknown) => void | Promise<void>
  /** Called after frontmatter is written to disk — used for live-reloading theme CSS vars. */
  onFrontmatterContentChanged?: (path: string, content: string) => void
  /** Called after a frontmatter mutation is fully persisted, including follow-up renames. */
  onFrontmatterPersisted?: () => void | Promise<void>
  /** Called for note-action owned disk writes so file watchers can ignore app-originated changes. */
  onInternalVaultWrite?: (path: string) => void
  /** Opens generated HTML in the system viewer without loading active content in Tolaria. */
  onOpenExternalFile?: (path: string) => void
}

function isTitleKey(key: string): boolean {
  return key.toLowerCase().replace(/\s+/g, '_') === 'title'
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function entryDisplayLabel(entry: VaultEntry): string {
  return safeString(entry.title).trim() || safeString(entry.filename).trim() || 'Note'
}

interface TitleRenameDeps {
  vaultPath: string
  tabsRef: React.MutableRefObject<{ entry: VaultEntry; content: string }[]>
  reloadVault?: () => Promise<unknown>
  replaceEntry?: (oldPath: string, patch: Partial<VaultEntry> & { path: string }) => void
  onPathRenamed?: (oldPath: string, newPath: string) => void
  setTabs: React.Dispatch<React.SetStateAction<{ entry: VaultEntry; content: string }[]>>
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  setToastMessage: (msg: string | null) => void
  updateTabContent: (path: string, content: string) => void
  onInternalVaultWrite?: (path: string) => void
}

interface FrontmatterCallbackParams {
  config: NoteActionsConfig
  path: string
  newContent: string | undefined
}

function applyFrontmatterCallbacks({ config, path, newContent }: FrontmatterCallbackParams): boolean {
  if (!newContent) return false
  config.onFrontmatterContentChanged?.(path, newContent)
  return true
}

interface RenameAfterTitleChangeParams {
  path: string
  newTitle: string
  deps: TitleRenameDeps
}

interface ApplyTitleRenamePathChangeParams {
  deps: TitleRenameDeps
  newPath: string
  newTitle: string
  path: string
}

function tabPathsExceptRenamed(
  tabs: { entry: VaultEntry; content: string }[],
  path: string,
  newPath: string,
): string[] {
  return tabs
    .filter((t) => !notePathsMatch(t.entry.path, path) && !notePathsMatch(t.entry.path, newPath))
    .map((t) => t.entry.path)
}

async function applyTitleRenamePathChange({
  deps,
  newPath,
  newTitle,
  path,
}: ApplyTitleRenamePathChangeParams): Promise<void> {
  const newFilename = notePathFilename(newPath)
  deps.onInternalVaultWrite?.(newPath)
  deps.onPathRenamed?.(path, newPath)
  deps.replaceEntry?.(path, {
    path: newPath,
    filename: newFilename,
    title: newTitle,
  } as Partial<VaultEntry> & { path: string })
  const newContent = await loadNoteContent({ path: newPath })
  deps.setTabs((prev) =>
    prev.map((t) =>
      notePathsMatch(t.entry.path, path)
        ? {
            entry: {
              ...t.entry,
              path: newPath,
              filename: newFilename,
              title: newTitle,
            },
            content: newContent,
          }
        : t,
    ),
  )
  if (notePathsMatch(deps.activeTabPathRef.current, path)) deps.handleSwitchTab(newPath)
  await reloadTabsAfterRename({
    tabPaths: tabPathsExceptRenamed(deps.tabsRef.current, path, newPath),
    updateTabContent: deps.updateTabContent,
  })
}

async function renameAfterTitleChange({ path, newTitle, deps }: RenameAfterTitleChangeParams): Promise<void> {
  const oldTitle = deps.tabsRef.current.find((t) => notePathsMatch(t.entry.path, path))?.entry.title
  deps.onInternalVaultWrite?.(path)
  const result = await performRename({
    path,
    newTitle,
    vaultPath: deps.vaultPath,
    oldTitle,
  })
  if (!notePathsMatch(result.new_path, path)) {
    await applyTitleRenamePathChange({
      path,
      newPath: result.new_path,
      newTitle,
      deps,
    })
  }
  await reloadVaultAfterRename(deps.reloadVault)
  deps.setToastMessage(renameToastMessage(result.updated_files, result.failed_updates ?? 0))
}

function shouldRenameOnTitleUpdate(key: string, value: FrontmatterValue): value is string {
  return isTitleKey(key) && typeof value === 'string' && value !== ''
}

async function notifyFrontmatterPersisted(config: NoteActionsConfig): Promise<void> {
  await config.onFrontmatterPersisted?.()
}

interface NavigateWikilinkParams {
  entries: VaultEntry[]
  sourceEntry?: VaultEntry
  target: string
  selectNote: (entry: VaultEntry) => void
}

function navigateWikilink({ entries, target, selectNote }: NavigateWikilinkParams): void {
  const found = resolveEntry(entries, target)
  if (found) selectNote(found)
  else console.warn(`Navigation target not found: ${target}`)
}

interface MaybeRenameAfterFrontmatterUpdateParams {
  path: string
  key: string
  value: FrontmatterValue
  deps: TitleRenameDeps
}

async function flushBeforeNoteMutation(
  path: string,
  flushBeforeMutation?: (path: string) => Promise<void>,
): Promise<boolean> {
  if (!flushBeforeMutation) return true

  try {
    await flushBeforeMutation(path)
    return true
  } catch {
    return false
  }
}

function activePathGuardAllowsMutation(
  path: string,
  activeTabPathRef: MutableRefObject<string | null>,
  options?: FrontmatterOpOptions,
): boolean {
  const requiredPath = options?.requireActivePath
  if (!requiredPath) return true
  return notePathsMatch(path, requiredPath) && notePathsMatch(activeTabPathRef.current, requiredPath)
}

async function maybeRenameAfterFrontmatterUpdate({
  path,
  key,
  value,
  deps,
}: MaybeRenameAfterFrontmatterUpdateParams): Promise<void> {
  if (!shouldRenameOnTitleUpdate(key, value)) return
  try {
    await renameAfterTitleChange({ path, newTitle: value, deps })
  } catch (err) {
    console.error('Failed to rename note after title change:', err)
  }
}

interface UpdateFrontmatterAndMaybeRenameParams {
  config: NoteActionsConfig
  deps: TitleRenameDeps
  key: string
  options?: FrontmatterOpOptions
  path: string
  runFrontmatterOp: RunFrontmatterOp
  value: FrontmatterValue
}

type RunFrontmatterOp = (
  op: 'update' | 'delete',
  path: string,
  key: string,
  value?: FrontmatterValue,
  options?: FrontmatterOpOptions,
) => Promise<string | undefined>

async function updateFrontmatterAndMaybeRename({
  config,
  deps,
  key,
  options,
  path,
  runFrontmatterOp,
  value,
}: UpdateFrontmatterAndMaybeRenameParams): Promise<boolean> {
  if (!activePathGuardAllowsMutation(path, deps.activeTabPathRef, options)) return false
  const canFlush = await flushBeforeNoteMutation(path, config.flushBeforeNoteMutation)
  if (!canFlush) return false
  if (!activePathGuardAllowsMutation(path, deps.activeTabPathRef, options)) return false

  config.onInternalVaultWrite?.(path)
  const newContent = await runFrontmatterOp('update', path, key, value, options)
  if (!applyFrontmatterCallbacks({ config, path, newContent })) return false

  await maybeRenameAfterFrontmatterUpdate({ path, key, value, deps })
  await notifyFrontmatterPersisted(config)
  return true
}

function buildTabManagementOptions(
  config: Pick<
    NoteActionsConfig,
    'flushBeforeNoteSwitch' | 'onMissingActiveVault' | 'reloadVault' | 'setToastMessage' | 'unsavedPaths'
  >,
) {
  const options: {
    beforeNavigate?: (fromPath: string, toPath: string) => Promise<void>
    hasUnsavedChanges: (path: string) => boolean
    onMissingActiveVault: (entry: VaultEntry, error: unknown) => void | Promise<void>
    onMissingNotePath: (entry: VaultEntry) => void
    onUnreadableNoteContent: (entry: VaultEntry) => void
  } = {
    hasUnsavedChanges: (path) => config.unsavedPaths?.has(path) ?? false,
    onMissingActiveVault: (entry, error) => {
      void config.onMissingActiveVault?.(entry, error)
    },
    onMissingNotePath: (entry) => {
      const label = entryDisplayLabel(entry)
      config.setToastMessage(`"${label}" could not be opened because its file is missing or moved.`)
      void config.reloadVault?.()
    },
    onUnreadableNoteContent: (entry) => {
      const label = entryDisplayLabel(entry)
      config.setToastMessage(`"${label}" could not be opened because it is not valid UTF-8 text.`)
    },
  }

  const flushBeforeNoteSwitch = config.flushBeforeNoteSwitch
  if (flushBeforeNoteSwitch) {
    options.beforeNavigate = (fromPath: string) => flushBeforeNoteSwitch(fromPath)
  }

  return options
}

function handleMissingFrontmatterTarget({
  activeTabPathRef,
  closeAllTabs,
  entries,
  path,
  reloadVault,
  setToastMessage,
}: {
  activeTabPathRef: MutableRefObject<string | null>
  closeAllTabs: () => void
  entries: VaultEntry[]
  path: string
  reloadVault?: () => Promise<unknown>
  setToastMessage: NoteActionsConfig['setToastMessage']
}) {
  const entry = findByNotePath(entries, path)
  const label = entry ? entryDisplayLabel(entry) : notePathFilename(path) || 'Note'
  if (notePathsMatch(activeTabPathRef.current, path)) closeAllTabs()
  setToastMessage(`"${label}" could not be opened because its file is missing or moved.`)
  void reloadVault?.()
}

function useGitignoredVisibilityTabCleanup({
  activeTabPathRef,
  closeAllTabs,
  setToastMessage,
}: {
  activeTabPathRef: React.MutableRefObject<string | null>
  closeAllTabs: () => void
  setToastMessage: (msg: string | null) => void
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityApplied = (event: Event) => {
      const { hide, visiblePaths } = (event as GitignoredVisibilityAppliedEvent).detail
      const activePath = activeTabPathRef.current
      if (!hide || !activePath || visiblePaths.some((path) => notePathsMatch(path, activePath))) return
      closeAllTabs()
      setToastMessage('Closed hidden Gitignored file')
    }

    window.addEventListener(GITIGNORED_VISIBILITY_APPLIED_EVENT, handleVisibilityApplied)
    return () => {
      window.removeEventListener(GITIGNORED_VISIBILITY_APPLIED_EVENT, handleVisibilityApplied)
    }
  }, [activeTabPathRef, closeAllTabs, setToastMessage])
}

function useFrontmatterActionHandlers(functionOptions: {
  config: NoteActionsConfig
  onPathRenamed?: (oldPath: string, newPath: string) => void
  renameTabsRef: TitleRenameDeps['tabsRef']
  setTabs: React.Dispatch<React.SetStateAction<{ entry: VaultEntry; content: string }[]>>
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  setToastMessage: (msg: string | null) => void
  updateTabContent: (path: string, newContent: string) => void
  runFrontmatterOp: RunFrontmatterOp
}) {
  const {
    config,
    onPathRenamed,
    renameTabsRef,
    setTabs,
    activeTabPathRef,
    handleSwitchTab,
    setToastMessage,
    updateTabContent,
    runFrontmatterOp,
  } = functionOptions

  const handleUpdateFrontmatter = useCallback(
    async (path: string, key: string, value: FrontmatterValue, options?: FrontmatterOpOptions) => {
    if (!isWritableFrontmatterKey(key)) return
    await updateFrontmatterAndMaybeRename({
      config,
      deps: {
        vaultPath: config.vaultPath,
        tabsRef: renameTabsRef,
        reloadVault: config.reloadVault,
        replaceEntry: config.replaceEntry,
        onPathRenamed,
        setTabs,
        activeTabPathRef,
        handleSwitchTab,
        setToastMessage,
        updateTabContent,
        onInternalVaultWrite: config.onInternalVaultWrite,
      },
      path,
      key,
      value,
      options,
      runFrontmatterOp,
    })
    },
    [
      activeTabPathRef,
      config,
      handleSwitchTab,
      onPathRenamed,
      renameTabsRef,
      runFrontmatterOp,
      setTabs,
      setToastMessage,
      updateTabContent,
    ],
  )

  return {
    handleUpdateFrontmatter,
  }
}

function useFrontmatterRunner({
  activeTabPathRef,
  closeAllTabs,
  entries,
  reloadVault,
  setToastMessage,
  updateEntry,
  updateTabContent,
}: {
  activeTabPathRef: MutableRefObject<string | null>
  closeAllTabs: () => void
  entries: VaultEntry[]
  reloadVault?: () => Promise<unknown>
  setToastMessage: NoteActionsConfig['setToastMessage']
  updateEntry: NoteActionsConfig['updateEntry']
  updateTabContent: (path: string, newContent: string) => void
}): RunFrontmatterOp {
  return useCallback(
    (op, path, key, value, options) =>
      runFrontmatterAndApply({
      op,
      path,
      key,
      value,
      callbacks: {
        cacheContent: cacheNoteContent,
        updateTab: updateTabContent,
        updateEntry,
        toast: setToastMessage,
        getEntry: (p) => findByNotePath(entries, p),
          onMissingNotePath: (p) =>
            handleMissingFrontmatterTarget({
          activeTabPathRef,
          closeAllTabs,
          entries,
          path: p,
          reloadVault,
          setToastMessage,
        }),
        shouldApply: (p) => activePathGuardAllowsMutation(p, activeTabPathRef, options),
      },
      options,
    }),
    [activeTabPathRef, closeAllTabs, entries, reloadVault, setToastMessage, updateEntry, updateTabContent],
  )
}

interface NoteActionsResultParts {
  creation: ReturnType<typeof useNoteCreation>
  frontmatterActions: ReturnType<typeof useFrontmatterActionHandlers>
  handleNavigateWikilink: (target: string) => void
  handleSelectNote: (entry: VaultEntry) => Promise<void>
  rename: ReturnType<typeof useNoteRename>
  tabMgmt: ReturnType<typeof useTabManagement>
}

function buildNoteActionsResult({
  creation,
  frontmatterActions,
  handleNavigateWikilink,
  handleSelectNote,
  rename,
  tabMgmt,
}: NoteActionsResultParts) {
  return {
    ...tabMgmt,
    handleSelectNote,
    handleNavigateWikilink,
    handleCreateNote: creation.handleCreateNote,
    handleCreateNoteImmediate: creation.handleCreateNoteImmediate,
    handleUpdateFrontmatter: frontmatterActions.handleUpdateFrontmatter,
    handleRenameNote: rename.handleRenameNote,
    handleRenameFilename: rename.handleRenameFilename,
    handleMoveNoteToFolder: rename.handleMoveNoteToFolder,
    handleMoveNoteToWorkspace: rename.handleMoveNoteToWorkspace,
  }
}

export function useNoteActions(config: NoteActionsConfig) {
  const { entries, setToastMessage, updateEntry } = config
  const tabMgmt = useTabManagement(buildTabManagementOptions(config))
  const { setTabs, handleSelectNote: selectTab, openTabWithContent, activeTabPathRef, handleSwitchTab } = tabMgmt
  const handleSelectNote = useCallback(
    async (entry: VaultEntry) => {
    await selectTab(entry)
    },
    [selectTab],
  )
  useGitignoredVisibilityTabCleanup({
    activeTabPathRef,
    closeAllTabs: tabMgmt.closeAllTabs,
    setToastMessage,
  })

  const updateTabContent = useCallback(
    (path: string, newContent: string) => {
    setTabs((prev) => {
      let changed = false
      const next = prev.map((tab) => {
        if (!notePathsMatch(tab.entry.path, path)) return tab
        if (tab.content === newContent) return tab
        changed = true
        return { ...tab, content: newContent }
      })
      return changed ? next : prev
    })
    },
    [setTabs],
  )

  const creation = useNoteCreation(config, { openTabWithContent })
  const rename = useNoteRename(
    {
      entries,
      setToastMessage,
      reloadVault: config.reloadVault,
      onPathRenamed: config.onPathRenamed,
    },
    {
      tabs: tabMgmt.tabs,
      setTabs,
      activeTabPathRef,
      handleSwitchTab,
      updateTabContent,
    },
  )

  const handleNavigateWikilink = useCallback(
    (target: string) =>
      navigateWikilink({
      entries,
      sourceEntry: tabMgmt.tabs.find((tab) => notePathsMatch(tab.entry.path, tabMgmt.activeTabPath))?.entry,
      target,
      selectNote: handleSelectNote,
    }),
    [entries, handleSelectNote, tabMgmt.activeTabPath, tabMgmt.tabs],
  )

  const runFrontmatterOp = useFrontmatterRunner({
    activeTabPathRef,
    closeAllTabs: tabMgmt.closeAllTabs,
    entries,
    reloadVault: config.reloadVault,
    setToastMessage,
    updateEntry,
    updateTabContent,
  })
  const frontmatterActions = useFrontmatterActionHandlers({
    config,
    onPathRenamed: config.onPathRenamed,
    renameTabsRef: rename.tabsRef,
    setTabs,
    activeTabPathRef,
    handleSwitchTab,
    setToastMessage,
    updateTabContent,
    runFrontmatterOp,
  })

  return buildNoteActionsResult({
    creation,
    frontmatterActions,
    handleNavigateWikilink,
    handleSelectNote,
    rename,
    tabMgmt,
  })
}
