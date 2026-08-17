import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { NoteList } from './components/NoteList'
import { LazyEditor } from './components/LazyEditor'
import { ResizeHandle } from './components/ResizeHandle'
import { QuickOpenPalette } from './components/QuickOpenPalette'
import { CommandPalette } from './components/CommandPalette'
import { SearchPanel } from './components/SearchPanel'
import { Toast } from './components/Toast'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'
import { NoteRetargetingDialogs } from './components/note-retargeting/NoteRetargetingDialogs'
import { StartupShellFallback } from './components/StartupShellFallback'
import { StartupScreen } from './components/StartupScreen'
import { useAutoGit } from './hooks/useAutoGit'
import { useVaultLoader } from './hooks/useVaultLoader'
import { useRecentVaultWrites, useVaultWatcher } from './hooks/useVaultWatcher'
import { useSettings } from './hooks/useSettings'
import { useNoteWidthMode } from './hooks/useNoteWidthMode'
import { useNoteActions } from './hooks/useNoteActions'
import { useAppCommands } from './hooks/useAppCommands'
import { useDialogs } from './hooks/useDialogs'
import { useVaultSwitcher } from './hooks/useVaultSwitcher'
import { useOnboarding } from './hooks/useOnboarding'
import { useGettingStartedClone } from './hooks/useGettingStartedClone'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useAppNavigation } from './hooks/useAppNavigation'
import { useDeleteActions } from './hooks/useDeleteActions'
import { useFolderActions } from './hooks/useFolderActions'
import { useFileActions } from './hooks/useFileActions'
import { useLayoutPanels } from './hooks/useLayoutPanels'
import { useLastActiveNote } from './hooks/useLastActiveNote'
import { useAppSave } from './hooks/useAppSave'
import { useWindowSaveFlush } from './hooks/useWindowSaveFlush'
import { useNoteRetargetingUi } from './hooks/useNoteRetargetingUi'
import { useAppWindowControls } from './hooks/useAppWindowControls'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { RestoreDeletedNoteDialog } from './components/RestoreDeletedNoteDialog'
import { DeleteProgressNotice } from './components/DeleteProgressNotice'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from './mock-tauri'
import type { SidebarSelection, VaultEntry } from './types'
import { refreshPulledVaultState } from './utils/pulledVaultRefresh'
import { RenameDetectedBanner } from './components/RenameDetectedBanner'
import type { NoteListMultiSelectionCommands } from './components/note-list/multiSelectionCommands'
import { TOLARIA_DOCS_URL } from './constants/docs'
import { openExternalUrl } from './utils/url'
import { requestPlainTextPaste } from './utils/plainTextPaste'
import { SETTINGS_SECTION_IDS } from './components/settingsSectionIds'
import { vaultPathForEntry } from './utils/workspaces'
import { uniqueNonBlankWorkspacePaths } from './utils/workspacePaths'
import {
  resolveActiveProject,
  resolveProjectLocation,
  selectionForProjectLocation,
  sidebarSelectionsEqual,
} from './utils/activeProject'
import { notePathsMatch } from './utils/notePathIdentity'
import { entrySupportsPreviewSourceToggle } from './utils/filePreview'
import { isMarkdownEntry } from './utils/typeDefinitions'
import type { RichEditorBlockTypeDefinition } from './utils/richEditorBlockTypes'
import { useManagedGit } from './hooks/useManagedGit'
import { useVisibleWorkspaceEntries, useWorkspaceGraphState } from './hooks/useWorkspaceGraphState'
import { AppPreferencesProvider, useAppPreferences } from './hooks/useAppPreferences'
import { useVaultRenameDetection } from './hooks/useVaultRenameDetection'
import { useStartupScreenState } from './hooks/useStartupScreenState'
import { useStartupStateMilestones } from './hooks/useStartupStateMilestones'
import { shouldReplaceSyncedTabEntry } from './utils/tabEntrySync'
import { dispatchRichEditorExternalFlush } from './components/editorExternalChangeEvents'
import {
  isActiveElementInsideEditorSurface,
  runEditorHistoryCommand,
  shouldPreferOnboardingVaultPath,
  type EditorHistoryCommands,
} from './utils/appOrchestration'
import { buildTagCounts, filterEntriesByTags } from './utils/noteTags'
import type { SearchHighlightRequest } from './utils/searchHighlight'
import './App.css'

// Type declarations for mock content storage and test overrides
declare global {
  interface Window {
    __mockContent?: Record<string, string>
    __mockHandlers?: Record<string, (args?: unknown) => unknown>
  }
}

const DEFAULT_SELECTION: SidebarSelection = { kind: 'filter', filter: 'all' }

/** Wraps useEditorSave to also keep outgoingLinks in sync on save and on content change. */
function App() {
  return <MainApp />
}

function MainApp() {
  const [selection, setSelection] = useState<SidebarSelection>(DEFAULT_SELECTION)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [pendingNoteListPdfExportPath, setPendingNoteListPdfExportPath] = useState<string | null>(null)
  const [searchHighlightRequest, setSearchHighlightRequest] = useState<SearchHighlightRequest | null>(null)
  const searchHighlightRequestIdRef = useRef(0)
  const handleSetSelection = useCallback((sel: SidebarSelection) => {
    setSelection(sel)
  }, [])
  const handleSelectSearchResult = useCallback((entry: VaultEntry, query: string) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    searchHighlightRequestIdRef.current += 1
    setSearchHighlightRequest({
      id: searchHighlightRequestIdRef.current,
      path: entry.path,
      query: trimmedQuery,
    })
  }, [])
  const layout = useLayoutPanels()
  const visibleNotesRef = useRef<VaultEntry[]>([])
  const multiSelectionCommandRef = useRef<NoteListMultiSelectionCommands | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const dialogs = useDialogs()
  const openDocs = useCallback(() => {
    void openExternalUrl(TOLARIA_DOCS_URL)
  }, [])
  const networkStatus = useNetworkStatus()
  const { settings, loaded: settingsLoaded, saveSettings } = useSettings()
  const flushBeforeVaultSwitchRef = useRef<(() => Promise<void>) | null>(null)
  const handleBeforeVaultSwitch = useCallback(
    () => flushBeforeVaultSwitchRef.current?.() ?? Promise.resolve(),
    [],
  )

  // onSwitch closure captures `notes` declared below — safe because it's only
  // called on user interaction, never during render (refs inside the hook
  // guarantee the latest closure is always used).
  const vaultSwitcher = useVaultSwitcher({
    onBeforeSwitch: handleBeforeVaultSwitch,
    onSwitch: () => {
      handleSetSelection(DEFAULT_SELECTION)
      setSelectedTags([])
      notes.closeAllTabs()
    },
    onToast: (msg) => setToastMessage(msg),
  })
  const {
    allVaults,
    defaultWorkspacePath,
    registerVaultSelection,
    selectedVaultPath,
    setDefaultWorkspace,
    syncVaultSelection,
    switchVault,
  } = vaultSwitcher

  const rememberVaultChoice = useCallback((vaultPath: string) => {
    if (!vaultPath) return

    if (allVaults.some((vault) => vault.path === vaultPath)) {
      switchVault(vaultPath)
      return
    }

    const label = vaultPath.split('/').filter(Boolean).pop() || 'Local Vault'
    syncVaultSelection(vaultPath, label)
  }, [allVaults, switchVault, syncVaultSelection])

  const handleGettingStartedVaultReady = useCallback((vaultPath: string) => {
    rememberVaultChoice(vaultPath)
    setToastMessage(`Getting Started vault created locally and opened at ${vaultPath}`)
  }, [rememberVaultChoice])

  const handleOnboardingVaultReady = useCallback((vaultPath: string, source: 'template' | 'empty' | 'existing') => {
    rememberVaultChoice(vaultPath)
    if (source === 'template') {
      setToastMessage(`Getting Started vault created locally and opened at ${vaultPath}`)
    }
  }, [rememberVaultChoice])
  const cloneGettingStartedVault = useGettingStartedClone({
    onError: (message) => setToastMessage(message),
    onSuccess: handleGettingStartedVaultReady,
  })
  const onboarding = useOnboarding(vaultSwitcher.vaultPath, {
    onVaultReady: handleOnboardingVaultReady,
    registerVault: registerVaultSelection,
  }, vaultSwitcher.loaded)
  // Onboarding can briefly own the vault path for a newly created/opened vault
  // before the persisted switcher catches up, but once the path is already in
  // the switcher list we should trust the explicit switcher state.
  const resolvedPath = shouldPreferOnboardingVaultPath(onboarding.state, vaultSwitcher.allVaults)
    ? onboarding.state.vaultPath
    : vaultSwitcher.vaultPath
  const [settingsInitialSectionId, setSettingsInitialSectionId] = useState<string | null>(null)
  const {
    folderVaults,
    graphVaults,
    multiWorkspaceEnabled,
    visibleWorkspacePathList,
    writableVaultPaths,
  } = useWorkspaceGraphState({
    allVaults,
    defaultWorkspacePath,
    resolvedPath,
    settings,
    windowMode: false,
  })
  const managedGit = useManagedGit(resolvedPath, vaultSwitcher.loaded)
  const automaticGitEnabled = managedGit.mode === 'managed'

  const vault = useVaultLoader(
    vaultSwitcher.loaded ? resolvedPath : '',
    graphVaults,
    multiWorkspaceEnabled ? defaultWorkspacePath : null,
    folderVaults,
    { loadModifiedFiles: true },
  )
  const visibleWorkspaceRoots = useMemo(() => {
    if (visibleWorkspacePathList && visibleWorkspacePathList.length > 0) return visibleWorkspacePathList
    return resolvedPath.trim() ? [resolvedPath] : []
  }, [resolvedPath, visibleWorkspacePathList])
  const visibleEntries = useVisibleWorkspaceEntries({
    entries: vault.entries,
    multiWorkspaceEnabled,
    visibleWorkspacePathList,
  })
  const activeProject = useMemo(
    () => resolveActiveProject(selection, resolvedPath),
    [resolvedPath, selection],
  )
  const projectPaths = useMemo(
    () => uniqueNonBlankWorkspacePaths([
      ...visibleWorkspaceRoots,
      ...visibleEntries.map((entry) => entry.workspace?.path ?? ''),
    ]),
    [visibleEntries, visibleWorkspaceRoots],
  )
  const handleRevealNote = useCallback((entry: VaultEntry) => {
    const nextSelection = selectionForProjectLocation(resolveProjectLocation(entry.path, projectPaths, resolvedPath))
    setSelection((current) => {
      if (sidebarSelectionsEqual(current, nextSelection)) return current
      return nextSelection
    })
  }, [projectPaths, resolvedPath])
  const tagFilteredEntries = useMemo(
    () => filterEntriesByTags(visibleEntries, selectedTags),
    [selectedTags, visibleEntries],
  )
  const availableTags = useMemo(() => buildTagCounts(visibleEntries), [visibleEntries])
  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((selectedTag) => selectedTag !== tag)
      : [...current, tag])
  }, [])
  const handleClearTagFilter = useCallback(() => {
    setSelectedTags([])
  }, [])
  const runtimeMissingVaultPath = vault.unavailableVaultPath
  const {
    markInternalWrite: markRecentVaultWrite,
    filterExternalPaths: filterExternalVaultPaths,
  } = useRecentVaultWrites({
    vaultPath: resolvedPath,
    vaultPaths: visibleWorkspaceRoots,
  })
  const effectiveSelection = selection

  const {
    allNotesFileVisibility,
    appLocale,
    dateDisplayFormat,
    documentThemeMode,
    folderViewShowNonMarkdown,
    handleSetThemeMode,
    handleSetUiLanguage,
    handleToggleThemeMode,
    noteListShowFilename,
    selectedUiLanguage,
    systemLocale,
  } = useAppPreferences({
    saveSettings,
    settings,
    settingsLoaded,
  })
  const fileActions = useFileActions({
    locale: appLocale,
    selection: effectiveSelection,
    setToastMessage,
    vaultPath: activeProject.projectPath,
  })
  const loadDefaultVaultModifiedFiles = vault.loadModifiedFiles
  const refreshGitModifiedFiles = useCallback(async () => {
    await loadDefaultVaultModifiedFiles()
  }, [loadDefaultVaultModifiedFiles])
  const reloadVault = vault.reloadVault

  const handleDeletedNoteRestored = useCallback(async () => {
    await reloadVault()
    await refreshGitModifiedFiles()
  }, [refreshGitModifiedFiles, reloadVault])

  const handleOpenSettings = useCallback(() => {
    setSettingsInitialSectionId(null)
    dialogs.openSettings()
  }, [dialogs])

  const handleOpenProjectSettings = useCallback(() => {
    setSettingsInitialSectionId(SETTINGS_SECTION_IDS.projects)
    dialogs.openSettings()
  }, [dialogs])

  const {
    detectedRenames,
    handleUpdateWikilinks,
    handleDismissRenames,
  } = useVaultRenameDetection({
    reloadVault: vault.reloadVault,
    setToastMessage,
    vaultPath: resolvedPath,
  })

  const flushPendingEditorContentRef = useRef<((path: string) => void) | null>(null)
  const flushPendingRawContentRef = useRef<((path: string) => void) | null>(null)
  const editorHistoryRef = useRef<EditorHistoryCommands | null>(null)
  const appSaveFlushBeforeActionRef = useRef<((path: string) => Promise<unknown>) | null>(null)
  const pendingEditorStateFlushRef = useRef<{ path: string; promise: Promise<void> } | null>(null)
  const flushEditorStateBeforeAction = useCallback((path: string) => {
    const pending = pendingEditorStateFlushRef.current
    if (pending?.path === path) return pending.promise

    const promise = (async () => {
      dispatchRichEditorExternalFlush()
      flushPendingEditorContentRef.current?.(path)
      flushPendingRawContentRef.current?.(path)
      await appSaveFlushBeforeActionRef.current?.(path)
    })()
    const nextPending = { path, promise }
    pendingEditorStateFlushRef.current = nextPending
    void promise.then(
      () => {
        if (pendingEditorStateFlushRef.current === nextPending) pendingEditorStateFlushRef.current = null
      },
      () => {
        if (pendingEditorStateFlushRef.current === nextPending) pendingEditorStateFlushRef.current = null
      },
    )
    return promise
  }, [])
  const handleCreatedVaultEntryPersisting = useCallback((path: string) => {
    markRecentVaultWrite(path)
    vault.addPendingSave(path)
  }, [markRecentVaultWrite, vault])
  const handleCreatedVaultEntryPersisted = useCallback((path: string) => {
    markRecentVaultWrite(path)
    void refreshGitModifiedFiles()
  }, [markRecentVaultWrite, refreshGitModifiedFiles])
  const handleMissingActiveVault = useCallback(() => {
    if (resolvedPath) vault.markVaultUnavailable(resolvedPath)
  }, [resolvedPath, vault])

  const notes = useNoteActions({
    addEntry: vault.addEntry,
    removeEntry: vault.removeEntry,
    entries: visibleEntries,
    flushBeforeNoteSwitch: flushEditorStateBeforeAction,
    flushBeforeNoteMutation: flushEditorStateBeforeAction,
    reloadVault: vault.reloadVault,
    setToastMessage,
    updateEntry: vault.updateEntry,
    activeProject,
    vaultPath: activeProject.projectPath,
    defaultWorkspacePath: multiWorkspaceEnabled ? defaultWorkspacePath : null,
    vaults: graphVaults ?? [],
    addPendingSave: handleCreatedVaultEntryPersisting,
    removePendingSave: vault.removePendingSave,
    trackUnsaved: vault.trackUnsaved,
    clearUnsaved: vault.clearUnsaved,
    unsavedPaths: vault.unsavedPaths,
    markContentPending: (path, content) => appSave.contentChangeRef.current(path, content),
    onNewNotePersisted: handleCreatedVaultEntryPersisted,
    onMissingActiveVault: handleMissingActiveVault,
    replaceEntry: vault.replaceEntry,
    onInternalVaultWrite: markRecentVaultWrite,
    onFrontmatterPersisted: refreshGitModifiedFiles,
    onPathRenamed: (oldPath, newPath) => appSave.trackRenamedPath(oldPath, newPath),
    onOpenExternalFile: fileActions.openExternalFile,
    onRevealNote: handleRevealNote,
  })
  const {
    handleSelectNote,
    handleReplaceActiveTab,
    closeAllTabs,
    handleUpdateFrontmatter,
  } = notes
  const handleUpdateTags = useCallback((path: string, tags: string[]) => {
    void handleUpdateFrontmatter(path, 'tags', tags, { silent: true })
  }, [handleUpdateFrontmatter])
  const noteActiveTabPath = notes.activeTabPath
  const noteActiveTabPathRef = notes.activeTabPathRef
  const handleSetDefaultWorkspace = useCallback(async (path: string) => {
    const activePath = noteActiveTabPathRef.current
    if (activePath) await flushEditorStateBeforeAction(activePath)
    setDefaultWorkspace(path)
  }, [flushEditorStateBeforeAction, noteActiveTabPathRef, setDefaultWorkspace])
  // The note action exposes a stable ref; only the stable flush callback can change.
  useEffect(() => {
    flushBeforeVaultSwitchRef.current = async () => {
      const path = noteActiveTabPathRef.current
      if (path) await flushEditorStateBeforeAction(path)
    }
  }, [flushEditorStateBeforeAction]) // eslint-disable-line react-hooks/exhaustive-deps -- noteActiveTabPathRef is stable
  useLastActiveNote({
    activeTabPath: noteActiveTabPath,
    enabled: true,
    entries: visibleEntries,
    isVaultLoading: vault.isLoading || !vaultSwitcher.loaded || !resolvedPath,
    openNote: handleSelectNote,
  })
  const noteTabsRef = useRef(notes.tabs)
  useEffect(() => {
    noteTabsRef.current = notes.tabs
  }, [notes.tabs])
  const refocusActiveEditor = useCallback((path: string) => {
    window.dispatchEvent(new CustomEvent('laputa:focus-editor', { detail: { path } }))
  }, [])
  const isActiveTabContentCurrent = useCallback(async (path: string) => {
    const activeTab = noteTabsRef.current.find((tab) => notePathsMatch(tab.entry.path, path))
    if (!activeTab) return false

    const request = {
      path: activeTab.entry.path,
      vaultPath: vaultPathForEntry(activeTab.entry, resolvedPath),
    }

    try {
      const content = isTauri()
        ? await invoke<string>('get_note_content', request)
        : await mockInvoke<string>('get_note_content', request)
      return content === activeTab.content
    } catch (error) {
      console.warn('Failed to compare active tab content before vault refresh:', error)
      return false
    }
  }, [resolvedPath])
  const handleVaultUpdate = useCallback(async (updatedFiles: string[]) => {
    const entries = await refreshPulledVaultState({
      activeTabPath: noteActiveTabPath,
      closeAllTabs,
      getActiveTabPath: () => noteActiveTabPathRef.current,
      hasUnsavedChanges: (path) => vault.unsavedPaths.has(path),
      isActiveTabContentCurrent,
      reloadFolders: vault.reloadFolders,
      reloadVault: vault.reloadVault,
      replaceActiveTab: handleReplaceActiveTab,
      refocusActiveEditor,
      shouldRefocusActiveEditor: isActiveElementInsideEditorSurface,
      updatedFiles,
      vaultPath: resolvedPath,
    })
    await refreshGitModifiedFiles()
    return entries
  }, [
      closeAllTabs,
      handleReplaceActiveTab,
      isActiveTabContentCurrent,
      noteActiveTabPath,
      noteActiveTabPathRef,
      refocusActiveEditor,
      refreshGitModifiedFiles,
      resolvedPath,
      vault.reloadFolders,
      vault.reloadVault,
      vault.unsavedPaths,
    ])
  const handleFocusedVaultUpdate = useCallback((updatedFiles: string[]) => {
    void handleVaultUpdate(updatedFiles)
  }, [handleVaultUpdate])
  useVaultWatcher({
    vaultPath: resolvedPath,
    vaultPaths: visibleWorkspaceRoots,
    onVaultChanged: handleFocusedVaultUpdate,
    filterChangedPaths: filterExternalVaultPaths,
  })
  // Keep note entry in sync with vault entries so banners (trash/archive)
  // and read-only state react immediately without reopening the note.
  useEffect(() => {
    notes.setTabs(prev => {
      let changed = false
      const next = prev.map(tab => {
        const fresh = visibleEntries.find(e => e.path === tab.entry.path)
        if (fresh && shouldReplaceSyncedTabEntry(tab.entry, fresh)) {
          changed = true
          return { ...tab, entry: fresh }
        }
        return tab
      })
      return changed ? next : prev
    })
  }, [visibleEntries, notes.setTabs]) // eslint-disable-line react-hooks/exhaustive-deps -- notes.setTabs is stable (useState setter)

  const { handleGoBack, handleGoForward, canGoBack, canGoForward } = useAppNavigation({
    entries: visibleEntries,
    activeTabPath: notes.activeTabPath,
    onSelectNote: notes.handleSelectNote,
  })

  const appSave = useAppSave({
    updateEntry: vault.updateEntry, setTabs: notes.setTabs, handleSwitchTab: notes.handleSwitchTab, setToastMessage,
    loadModifiedFiles: refreshGitModifiedFiles,
    trackUnsaved: vault.trackUnsaved, clearUnsaved: vault.clearUnsaved, unsavedPaths: vault.unsavedPaths,
    tabs: notes.tabs, activeTabPath: notes.activeTabPath,
    handleRenameNote: notes.handleRenameNote, handleRenameFilename: notes.handleRenameFilename,
    replaceEntry: vault.replaceEntry, resolvedPath,
    writableVaultPaths,
    initialH1AutoRenameEnabled: settings.initial_h1_auto_rename_enabled !== false,
    onInternalVaultWrite: markRecentVaultWrite,
    locale: appLocale,
  })
  useEffect(() => {
    appSaveFlushBeforeActionRef.current = appSave.flushBeforeAction
  }, [appSave.flushBeforeAction])
  const flushCurrentNote = useCallback(() => {
    const path = noteActiveTabPathRef.current
    return path ? flushEditorStateBeforeAction(path) : Promise.resolve()
  }, [flushEditorStateBeforeAction, noteActiveTabPathRef])
  useWindowSaveFlush(flushCurrentNote)

  const handleCreateFolder = useCallback(async (
    name: string,
    parent?: { path: string; rootPath?: string },
  ) => {
    try {
      const vaultPath = parent?.rootPath?.trim() ? parent.rootPath : activeProject.projectPath
      const parentPath = parent
        ? (parent.path.length > 0 ? parent.path : null)
        : (activeProject.folderPath || null)
      const args = { vaultPath, folderName: name, parentPath }
      if (isTauri()) {
        await invoke('create_vault_folder', args)
      } else {
        await mockInvoke('create_vault_folder', args)
      }
      await vault.reloadFolders()
      setToastMessage(`Created folder "${name}"`)
      return true
    } catch (e) {
      setToastMessage(`Failed to create folder: ${e}`)
      return false
    }
  }, [activeProject, vault])

  const folderActions = useFolderActions({
    vaultPath: activeProject.projectPath,
    selection: effectiveSelection,
    setSelection: handleSetSelection,
    setTabs: notes.setTabs,
    activeTabPathRef: notes.activeTabPathRef,
    handleSwitchTab: notes.handleSwitchTab,
    closeAllTabs: notes.closeAllTabs,
    reloadVault: vault.reloadVault,
    reloadFolders: vault.reloadFolders,
    setToastMessage,
  })
  const autoGit = useAutoGit({
    enabled: automaticGitEnabled,
    idleThresholdSeconds: 90,
    inactiveThresholdSeconds: 30,
    isGitVault: automaticGitEnabled,
    hasPendingChanges: vault.modifiedFiles.length > 0,
    hasUnsavedChanges: vault.unsavedPaths.size > 0,
    onCheckpoint: async () => {
      try {
        await appSave.savePending()
        const command = isTauri() ? invoke : mockInvoke
        await command('git_snapshot', { vaultPath: resolvedPath })
        await refreshGitModifiedFiles()
        return true
      } catch (error) {
        console.warn('[git] Automatic snapshot failed:', error)
        return false
      }
    },
  })
  const recordAutoGitActivity = autoGit.recordActivity
  const handleAppContentChange = appSave.handleContentChange
  const handleAppSave = appSave.handleSave
  const loadModifiedFiles = refreshGitModifiedFiles

  const handleTrackedContentChange = useCallback((path: string, content: string) => {
    recordAutoGitActivity()
    handleAppContentChange(path, content)
  }, [handleAppContentChange, recordAutoGitActivity])

  const handleTrackedSave = useCallback(async (...args: Parameters<typeof handleAppSave>) => {
    if (notes.activeTabPath) {
      dispatchRichEditorExternalFlush()
      flushPendingEditorContentRef.current?.(notes.activeTabPath)
      flushPendingRawContentRef.current?.(notes.activeTabPath)
    }
    const result = await handleAppSave(...args)
    const activeTab = notes.activeTabPath
      ? notes.tabs.find((tab) => tab.entry.path === notes.activeTabPath)
      : null
    if (activeTab) await refreshGitModifiedFiles()
    recordAutoGitActivity()
    return result
  }, [
    handleAppSave,
    notes.activeTabPath,
    notes.tabs,
    recordAutoGitActivity,
    refreshGitModifiedFiles,
  ])

  const seedAutoGitSavedChange = useCallback(async () => {
    if (isTauri()) {
      throw new Error('seedAutoGitSavedChange is only available in browser smoke tests')
    }

    const activePath = notes.activeTabPath
    const activeTab = activePath
      ? notes.tabs.find((tab) => tab.entry.path === activePath)
      : null

    if (!activePath || !activeTab) {
      throw new Error('No active note is available for the AutoGit test bridge')
    }

    const saveNoteContent = window.__mockHandlers?.save_note_content
    const activeVaultPath = resolvedPath
    if (typeof saveNoteContent === 'function') {
      await Promise.resolve(saveNoteContent({ path: activePath, content: activeTab.content, vaultPath: activeVaultPath }))
    } else {
      await mockInvoke('save_note_content', { path: activePath, content: activeTab.content, vaultPath: activeVaultPath })
    }

    await loadModifiedFiles()
    recordAutoGitActivity()
  }, [loadModifiedFiles, notes.activeTabPath, notes.tabs, recordAutoGitActivity, resolvedPath])

  useEffect(() => {
    window.__laputaTest = {
      ...window.__laputaTest,
      activeTabPath: notes.activeTabPath,
      seedAutoGitSavedChange,
    }

    return () => {
      if (window.__laputaTest?.seedAutoGitSavedChange === seedAutoGitSavedChange) {
        delete window.__laputaTest.seedAutoGitSavedChange
      }
    }
  }, [notes.activeTabPath, seedAutoGitSavedChange])

  const resolveVaultPathForNotePath = useCallback((path: string) => {
    const entry = vault.entries.find((candidate) => notePathsMatch(candidate.path, path))
    return entry ? vaultPathForEntry(entry, resolvedPath) : resolvedPath
  }, [resolvedPath, vault.entries])

  const deleteActions = useDeleteActions({
    onDeselectNote: (path: string) => { if (notes.activeTabPath === path) notes.closeAllTabs() },
    removeEntry: vault.removeEntry,
    removeEntries: vault.removeEntries,
    resolveVaultPathForPath: resolveVaultPathForNotePath,
    refreshModifiedFiles: refreshGitModifiedFiles,
    reloadVault: vault.reloadVault,
    setToastMessage,
  })

  const {
    backlinksToggleRef,
    findInNoteRef,
    handleCollapseSidebar,
    handleSetViewMode,
    handleToggleRightPanel,
    noteListVisible,
    pdfExportRef,
    rawToggleRef,
    sidebarVisible,
    tableOfContentsToggleRef,
    zoom,
  } = useAppWindowControls({
    layout,
  })
  const turnCurrentBlockIntoRef = useRef<((target: RichEditorBlockTypeDefinition) => void) | null>(null)

  const handleRepairVault = useCallback(async () => {
    if (!resolvedPath) return
    try {
      const tauriInvoke = isTauri() ? invoke : mockInvoke
      const msg = await tauriInvoke<string>('repair_vault', { vaultPath: resolvedPath })
      await vault.reloadVault()
      setToastMessage(msg)
    } catch (err) {
      setToastMessage(`Failed to repair vault: ${err}`)
    }
  }, [resolvedPath, vault])

  const activeCommandEntry = useMemo(() => {
    if (!notes.activeTabPath) return null
    return notes.tabs.find((tab) => tab.entry.path === notes.activeTabPath)?.entry
      ?? vault.entries.find((entry) => entry.path === notes.activeTabPath)
      ?? null
  }, [notes.activeTabPath, notes.tabs, vault.entries])
  const noteRetargetingUi = useNoteRetargetingUi({
    activeEntry: activeCommandEntry,
    activeNoteBlocked: false,
    entries: visibleEntries,
    folders: vault.folders,
    setToastMessage,
    vaultPath: resolvedPath,
    moveNoteToFolder: notes.handleMoveNoteToFolder,
  })

  const canToggleRichEditor = !!activeCommandEntry
    && entrySupportsPreviewSourceToggle(activeCommandEntry)
  const toggleRawEditorCommand = useMemo(
    () => canToggleRichEditor ? () => rawToggleRef.current() : undefined,
    [canToggleRichEditor, rawToggleRef],
  )
  const toggleTableOfContentsCommand = useCallback(() => {
    if (notes.activeTabPath) tableOfContentsToggleRef.current()
  }, [notes.activeTabPath, tableOfContentsToggleRef])
  const toggleBacklinksCommand = useCallback(() => {
    if (notes.activeTabPath) backlinksToggleRef.current()
  }, [backlinksToggleRef, notes.activeTabPath])
  const exportNotePdfCommand = useCallback(() => {
    pdfExportRef.current?.('app_command')
  }, [pdfExportRef])
  const findInNoteCommand = useCallback(() => {
    findInNoteRef.current?.({ replace: false })
  }, [findInNoteRef])
  const replaceInNoteCommand = useCallback(() => {
    findInNoteRef.current?.({ replace: true })
  }, [findInNoteRef])
  const turnCurrentBlockIntoCommand = useCallback((target: RichEditorBlockTypeDefinition) => {
    turnCurrentBlockIntoRef.current?.(target)
  }, [])
  const pastePlainTextCommand = useCallback(() => {
    void requestPlainTextPaste().catch((error) => {
      console.warn('[paste] Failed to paste plain text:', error)
    })
  }, [])
  const removeActiveVaultCommand = useCallback(() => {
    vaultSwitcher.removeVault(vaultSwitcher.vaultPath)
  }, [vaultSwitcher])
  const moveNoteToFolderCommand = useMemo(
    () => noteRetargetingUi.canMoveActiveNoteToFolder ? noteRetargetingUi.openMoveNoteToFolderDialog : undefined,
    [noteRetargetingUi.canMoveActiveNoteToFolder, noteRetargetingUi.openMoveNoteToFolderDialog],
  )
  const reloadVaultForCommand = vault.reloadVault
  const handleManualVaultReload = useCallback(async () => {
    const entries = await reloadVaultForCommand()
    setToastMessage(`Vault reloaded (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'})`)
    return entries
  }, [reloadVaultForCommand])

  const {
    activeTab,
    defaultNoteWidth,
    noteWidth: activeNoteWidth,
    setDefaultNoteWidth: handleSetDefaultNoteWidth,
    setNoteWidth: handleSetActiveNoteWidth,
    toggleNoteWidth: handleToggleNoteWidth,
  } = useNoteWidthMode({
    tabs: notes.tabs,
    activeTabPath: notes.activeTabPath,
    settings,
    saveSettings,
    updateFrontmatter: notes.handleUpdateFrontmatter,
    setToastMessage,
  })
  const activeTabEntry = activeTab?.entry ?? null
  const activeTabPath = activeTabEntry?.path
  const handleSelectNoteForPdfExport = notes.handleSelectNote
  const handleExportNotePdfFromList = useCallback((entry: VaultEntry) => {
    if (!isMarkdownEntry(entry)) return

    if (activeTabPath === entry.path) {
      pdfExportRef.current?.('note_list_context_menu')
      return
    }

    setPendingNoteListPdfExportPath(entry.path)
    handleSelectNoteForPdfExport(entry)
  }, [activeTabPath, handleSelectNoteForPdfExport, pdfExportRef])
  useEffect(() => {
    if (!pendingNoteListPdfExportPath) return
    if (!activeTabEntry || activeTabPath !== pendingNoteListPdfExportPath) return

    const frameId = requestAnimationFrame(() => {
      if (isMarkdownEntry(activeTabEntry)) pdfExportRef.current?.('note_list_context_menu')
      setPendingNoteListPdfExportPath(null)
    })

    return () => cancelAnimationFrame(frameId)
  }, [activeTabEntry, activeTabPath, pendingNoteListPdfExportPath, pdfExportRef])

  const {
    isStartupLoading,
    isVaultContentLoading,
    shouldResumeFreshStartOnboarding,
    shouldShowStartupScreen,
  } = useStartupScreenState({
    onboardingState: onboarding.state,
    runtimeMissingVaultPath,
    selectedVaultPath,
    vaultIsLoading: vault.isLoading,
    vaultSwitcher,
  })
  useStartupStateMilestones({
    isVaultContentLoading,
    onboardingStatus: onboarding.state.status,
    settingsLoaded,
    vaultListLoaded: vaultSwitcher.loaded,
  })
  const activeEditorVaultPath = activeTab ? vaultPathForEntry(activeTab.entry, resolvedPath) : resolvedPath
  const undoCommand = useCallback(() => {
    runEditorHistoryCommand(editorHistoryRef.current, noteActiveTabPathRef.current, 'undo')
  }, [noteActiveTabPathRef])
  const redoCommand = useCallback(() => {
    runEditorHistoryCommand(editorHistoryRef.current, noteActiveTabPathRef.current, 'redo')
  }, [noteActiveTabPathRef])

  const commands = useAppCommands({
    activeTabPath: notes.activeTabPath, activeTabPathRef: notes.activeTabPathRef,
    entries: visibleEntries,
    visibleNotesRef,
    multiSelectionCommandRef,
    selection: effectiveSelection,
    onQuickOpen: dialogs.openQuickOpen, onCommandPalette: dialogs.openCommandPalette,
    onSearch: dialogs.openSearch,
    onFindInNote: findInNoteCommand,
    onReplaceInNote: replaceInNoteCommand,
    onTurnCurrentBlockInto: turnCurrentBlockIntoCommand,
    onPastePlainText: pastePlainTextCommand,
    onCreateNote: notes.handleCreateNoteImmediate,
    onSave: appSave.handleSave,
    onUndo: undoCommand,
    onRedo: redoCommand,
    onOpenSettings: handleOpenSettings,
    onDeleteNote: deleteActions.handleDeleteNote,
    onSetViewMode: handleSetViewMode,
    onToggleBacklinks: toggleBacklinksCommand,
    onToggleRawEditor: toggleRawEditorCommand,
    onToggleTableOfContents: toggleTableOfContentsCommand,
    onExportNoteAsPdf: exportNotePdfCommand,
    noteWidth: activeNoteWidth,
    defaultNoteWidth,
    onSetNoteWidth: handleSetActiveNoteWidth,
    onSetDefaultNoteWidth: handleSetDefaultNoteWidth,
    onZoomIn: zoom.zoomIn, onZoomOut: zoom.zoomOut, onZoomReset: zoom.zoomReset,
    zoomLevel: zoom.zoomLevel,
    onSelect: handleSetSelection,
    onRenameFolder: folderActions.renameSelectedFolder,
    onDeleteFolder: folderActions.deleteSelectedFolder,
    onRevealSelectedFolder: fileActions.revealSelectedFolder,
    onCopySelectedFolderPath: fileActions.copySelectedFolderPath,
    onReplaceActiveTab: notes.handleReplaceActiveTab,
    onSelectNote: notes.handleSelectNote,
    onGoBack: handleGoBack, onGoForward: handleGoForward,
    canGoBack: canGoBack, canGoForward: canGoForward,
    onOpenVault: vaultSwitcher.handleOpenLocalFolder,
    onCreateEmptyVault: vaultSwitcher.handleCreateEmptyVault,
    onRemoveActiveVault: removeActiveVaultCommand,
    onRestoreGettingStarted: cloneGettingStartedVault,
    isGettingStartedHidden: vaultSwitcher.isGettingStartedHidden,
    vaultCount: vaultSwitcher.allVaults.length,
    locale: appLocale,
    systemLocale,
    selectedUiLanguage,
    onSetUiLanguage: handleSetUiLanguage,
    onSetThemeMode: handleSetThemeMode,
    onReloadVault: handleManualVaultReload,
    onRepairVault: handleRepairVault,
    onRestoreDeletedNote: automaticGitEnabled ? dialogs.openRestoreDeletedNote : undefined,
    onMoveNoteToFolder: moveNoteToFolderCommand,
    canMoveNoteToFolder: noteRetargetingUi.canMoveActiveNoteToFolder,
    onRevealActiveFile: fileActions.revealFile,
    onCopyActiveFilePath: fileActions.copyFilePath,
    onOpenActiveFileExternal: fileActions.openExternalFile,
  })

  if (!vault.hasCompletedInitialLoad && isVaultContentLoading) {
    return <StartupShellFallback />
  }
  if (shouldShowStartupScreen) {
    return (
      <StartupScreen
        isOffline={networkStatus.isOffline}
        isStartupLoading={isStartupLoading}
        locale={appLocale}
        onboarding={onboarding}
        runtimeMissingVaultPath={runtimeMissingVaultPath}
        shouldResumeFreshStartOnboarding={shouldResumeFreshStartOnboarding}
        setToastMessage={setToastMessage}
        toastMessage={toastMessage}
        vaultSwitcher={vaultSwitcher}
      />
    )
  }

  return (
    <AppPreferencesProvider appLocale={appLocale} dateDisplayFormat={dateDisplayFormat}>
      <div className="app-shell">
        <div className="app">
          {sidebarVisible && (
            <>
              <div className="app__sidebar" style={{ width: layout.sidebarWidth }}>
                <Sidebar
                  entries={visibleEntries}
                  selectedTags={selectedTags}
                  onToggleTag={handleToggleTag}
                  folders={vault.folders}
                  selection={effectiveSelection}
                  onSelect={handleSetSelection}
                  onCreateFolder={handleCreateFolder}
                  onRenameFolder={folderActions.renameFolder}
                  onDeleteFolder={folderActions.requestDeleteFolder}
                  folderFileActions={fileActions.folderActions}
                  renamingFolderPath={folderActions.renamingFolderPath}
                  renamingFolderRootPath={folderActions.renamingFolderRootPath}
                  onStartRenameFolder={folderActions.startFolderRename}
                  onCancelRenameFolder={folderActions.cancelFolderRename}
                  onCanDropNoteOnFolder={noteRetargetingUi.canDropNoteOnFolder}
                  onMoveNoteToFolder={noteRetargetingUi.moveIntoFolder}
                  allNotesFileVisibility={allNotesFileVisibility}
                  onCollapse={handleCollapseSidebar}
                  onGoBack={handleGoBack}
                  onGoForward={handleGoForward}
                  canGoBack={canGoBack}
                  canGoForward={canGoForward}
                  locale={appLocale}
                  loading={isVaultContentLoading}
                  vaultRootPath={resolvedPath}
                  writableVaultPaths={writableVaultPaths}
                />
              </div>
              <ResizeHandle onResize={layout.handleSidebarResize} />
            </>
          )}
          {noteListVisible && (
            <>
              <div className="app__note-list" style={{ width: layout.noteListWidth }}>
                <NoteList vaultPath={activeProject.projectPath} entries={tagFilteredEntries} selection={effectiveSelection} selectedNote={activeTab?.entry ?? null} selectedTags={selectedTags} onToggleTag={handleToggleTag} onClearTagFilter={handleClearTagFilter} loading={isVaultContentLoading} getNoteStatus={vault.getNoteStatus} sidebarCollapsed={!sidebarVisible} onSelectNote={notes.handleSelectNote} onReplaceActiveTab={notes.handleReplaceActiveTab} onCreateNote={notes.handleCreateNoteImmediate} onBulkDeletePermanently={deleteActions.handleBulkDeletePermanently} onRenameFilename={appSave.handleFilenameRename} onExportPdf={handleExportNotePdfFromList} onRevealFile={fileActions.revealFile} onCopyFilePath={fileActions.copyFilePath} visibleNotesRef={visibleNotesRef} allNotesFileVisibility={allNotesFileVisibility} folderViewShowNonMarkdown={folderViewShowNonMarkdown} showFilename={noteListShowFilename} multiSelectionCommandRef={multiSelectionCommandRef} locale={appLocale} />
              </div>
              <ResizeHandle onResize={layout.handleNoteListResize} />
            </>
          )}
          <div className="app__editor">
            <LazyEditor
              tabs={notes.tabs}
              activeTabPath={notes.activeTabPath}
              isVaultLoading={isVaultContentLoading}
              entries={vault.entries}
              availableTags={availableTags}
              onUpdateTags={handleUpdateTags}
              onNavigateWikilink={notes.handleNavigateWikilink}
              onCreateNote={notes.handleCreateNoteImmediate}
              rightPanelCollapsed={layout.rightPanelCollapsed}
              onToggleRightPanel={handleToggleRightPanel}
              rightPanelWidth={layout.rightPanelWidth}
              onRightPanelResize={layout.handleRightPanelResize}
              rightPanelEntry={activeTab?.entry ?? null}
              rightPanelContent={activeTab?.content ?? null}
              vaultPath={activeEditorVaultPath}
              onRevealFile={fileActions.revealFile}
              onCopyFilePath={fileActions.copyFilePath}
              onOpenExternalFile={fileActions.openExternalFile}
              onDeleteNote={deleteActions.handleDeleteNote}
              onContentChange={handleTrackedContentChange}
              flushBeforeSwap={flushEditorStateBeforeAction}
              onSave={handleTrackedSave}
              onRenameFilename={appSave.handleFilenameRename}
              noteWidth={activeNoteWidth}
              onToggleNoteWidth={handleToggleNoteWidth}
              rawToggleRef={rawToggleRef}
              tableOfContentsToggleRef={tableOfContentsToggleRef}
              backlinksToggleRef={backlinksToggleRef}
              pdfExportRef={pdfExportRef}
              turnCurrentBlockIntoRef={turnCurrentBlockIntoRef}
              findInNoteRef={findInNoteRef}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
              leftPanelsCollapsed={!sidebarVisible && !noteListVisible}
              historyRef={editorHistoryRef}
              flushPendingEditorContentRef={flushPendingEditorContentRef}
              flushPendingRawContentRef={flushPendingRawContentRef}
              searchHighlightRequest={searchHighlightRequest}
              onToast={setToastMessage}
              locale={appLocale}
            />
          </div>
        </div>
        <RenameDetectedBanner renames={detectedRenames} onUpdate={handleUpdateWikilinks} onDismiss={handleDismissRenames} />
              <StatusBar noteCount={visibleEntries.length} vaultPath={resolvedPath} defaultWorkspacePath={defaultWorkspacePath} vaults={vaultSwitcher.allVaults} multiWorkspaceEnabled={multiWorkspaceEnabled} onSwitchVault={vaultSwitcher.switchVault} onSetDefaultWorkspace={handleSetDefaultWorkspace} onOpenSettings={handleOpenSettings} onOpenVaultSettings={handleOpenProjectSettings} onOpenDocs={openDocs} onOpenLocalFolder={vaultSwitcher.handleOpenLocalFolder} onCreateEmptyVault={vaultSwitcher.handleCreateEmptyVault} onCloneGettingStarted={cloneGettingStartedVault} isOffline={networkStatus.isOffline} isVaultReloading={vault.isReloading || isVaultContentLoading} zoomLevel={zoom.zoomLevel} themeMode={documentThemeMode} onZoomReset={zoom.zoomReset} onToggleThemeMode={settingsLoaded ? handleToggleThemeMode : undefined} onRemoveVault={vaultSwitcher.removeVault} onReorderVaults={vaultSwitcher.reorderVaults} onUpdateWorkspaceIdentity={vaultSwitcher.updateWorkspaceIdentity} locale={appLocale} />
        <DeleteProgressNotice count={deleteActions.pendingDeleteCount} />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        <QuickOpenPalette open={dialogs.showQuickOpen} entries={visibleEntries} isLoading={vault.isLoading} onSelect={notes.handleSelectNote} onCreateNote={(title) => notes.handleCreateNote(title, 'quick_open')} onClose={dialogs.closeQuickOpen} locale={appLocale} />
        <CommandPalette
          open={dialogs.showCommandPalette}
          commands={commands}
          locale={appLocale}
          onClose={dialogs.closeCommandPalette}
        />
        <RestoreDeletedNoteDialog
          open={dialogs.showRestoreDeletedNote}
          managed={automaticGitEnabled}
          vaultPath={resolvedPath}
          locale={appLocale}
          onClose={dialogs.closeRestoreDeletedNote}
          onRestored={handleDeletedNoteRestored}
          onToast={setToastMessage}
        />
        <SearchPanel open={dialogs.showSearch} vaultPath={visibleWorkspaceRoots} entries={visibleEntries} onSelectNote={notes.handleSelectNote} onSelectSearchResult={handleSelectSearchResult} onClose={dialogs.closeSearch} />
        <NoteRetargetingDialogs
          dialogState={noteRetargetingUi.dialogState}
          dialogEntry={noteRetargetingUi.dialogEntry}
          folderOptions={noteRetargetingUi.folderOptions}
          onClose={noteRetargetingUi.closeDialog}
          onSelectFolder={noteRetargetingUi.selectFolder}
        />
        <SettingsPanel open={dialogs.showSettings} initialSectionId={settingsInitialSectionId} settings={settings} locale={appLocale} systemLocale={systemLocale} projects={vaultSwitcher.allVaults} defaultProjectPath={vaultSwitcher.defaultWorkspacePath} onSetDefaultProject={vaultSwitcher.setDefaultWorkspace} onRemoveProject={vaultSwitcher.removeVault} onReorderProjects={vaultSwitcher.reorderVaults} onUpdateProjectIdentity={vaultSwitcher.updateWorkspaceIdentity} onSave={saveSettings} onClose={dialogs.closeSettings} />
        {deleteActions.confirmDelete && (
          <ConfirmDeleteDialog
            open={true}
            title={deleteActions.confirmDelete.title}
            message={deleteActions.confirmDelete.message}
            confirmLabel={deleteActions.confirmDelete.confirmLabel}
            onConfirm={deleteActions.confirmDelete.onConfirm}
            onCancel={() => deleteActions.setConfirmDelete(null)}
          />
        )}
        {folderActions.confirmDeleteFolder && (
          <ConfirmDeleteDialog
            open={true}
            title={folderActions.confirmDeleteFolder.title}
            message={folderActions.confirmDeleteFolder.message}
            confirmLabel={folderActions.confirmDeleteFolder.confirmLabel}
            onConfirm={folderActions.confirmDeleteSelectedFolder}
            onCancel={folderActions.cancelDeleteFolder}
          />
        )}
      </div>
    </AppPreferencesProvider>
  )
}

export default App
