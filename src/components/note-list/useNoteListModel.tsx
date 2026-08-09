import { useEffect, useMemo, useCallback } from 'react'
import type {
  VaultEntry,
  SidebarSelection,
  ModifiedFile,
  NoteStatus,
} from '../../types'
import type { AppLocale } from '../../lib/i18n'
import type { AllNotesFileVisibility } from '../../utils/allNotesFileVisibility'
import type { GitRepositoryOption } from '../../utils/gitRepositories'
import type { ImmediateCreateOptions } from '../../hooks/useNoteCreation'
import { NoteItem } from '../NoteItem'
import { prefetchNoteContent } from '../../hooks/useTabManagement'
import type { MultiSelectState } from '../../hooks/useMultiSelect'
import { isDeletedNoteEntry, resolveHeaderTitle, type DeletedNoteEntry } from './noteListUtils'
import { useNoteListFullTextSearch } from './noteListFullTextSearch'
import { filterEntriesByNoteListQuery } from './noteListSearch'
import { useNoteListSearchState } from './useNoteListSearchState'
import {
  useChangeStatusResolver,
  useModifiedFilesState,
  useNoteListData,
  useNoteListInteractions,
  useNoteListSort,
  useVisibleNotesSync,
} from './noteListHooks'
import { useChangesContextMenu } from './NoteListChangesMenu'
import { useNoteListContextMenu } from './NoteListContextMenu'
import { addNoteListSearchToggleListener, dispatchNoteListSearchAvailability } from '../../utils/noteListSearchEvents'
import { useDateDisplayFormat } from '../../hooks/useAppPreferences'

const LIKELY_NEXT_PRELOAD_LIMIT = 6
const ADJACENT_PRELOAD_RADIUS = 3
const LIKELY_NEXT_PRELOAD_START_DELAY_MS = 350
const LIKELY_NEXT_PRELOAD_STEP_DELAY_MS = 180

function likelyNextPreloadEntries(entries: VaultEntry[], selectedNotePath: string | null): VaultEntry[] {
  if (entries.length === 0) return []
  const selectedIndex = selectedNotePath ? entries.findIndex((entry) => entry.path === selectedNotePath) : -1
  const start = selectedIndex >= 0 ? Math.max(0, selectedIndex - ADJACENT_PRELOAD_RADIUS) : 0
  const end =
    selectedIndex >= 0
    ? Math.min(entries.length, selectedIndex + ADJACENT_PRELOAD_RADIUS + 1)
    : Math.min(entries.length, LIKELY_NEXT_PRELOAD_LIMIT)
  return entries
    .slice(start, end)
    .map((entry, offset) => ({ entry, index: start + offset }))
    .sort((left, right) => {
      if (selectedIndex < 0) return 0
      return Math.abs(left.index - selectedIndex) - Math.abs(right.index - selectedIndex)
    })
    .map(({ entry }) => entry)
    .filter((entry) => entry.path !== selectedNotePath && !isDeletedNoteEntry(entry) && entry.fileKind !== 'binary')
    .slice(0, LIKELY_NEXT_PRELOAD_LIMIT)
}

function useLikelyNextPreload(entries: VaultEntry[], selectedNotePath: string | null) {
  useEffect(() => {
    const candidates = likelyNextPreloadEntries(entries, selectedNotePath)
    if (candidates.length === 0) return

    let stepTimer: number | null = null
    let candidateIndex = 0
    const startTimer = window.setTimeout(() => {
      const preloadNext = () => {
        const entry = candidates.at(candidateIndex)
        if (!entry) return
        const parsedBlockPreload = candidateIndex === 0
        candidateIndex += 1
        prefetchNoteContent(entry, { parsedBlockPreload })
        stepTimer = window.setTimeout(preloadNext, LIKELY_NEXT_PRELOAD_STEP_DELAY_MS)
      }
      preloadNext()
    }, LIKELY_NEXT_PRELOAD_START_DELAY_MS)

    return () => {
      window.clearTimeout(startTimer)
      if (stepTimer !== null) window.clearTimeout(stepTimer)
    }
  }, [entries, selectedNotePath])
}

function useBulkActions(
  multiSelect: MultiSelectState,
  onBulkDeletePermanently: NoteListProps['onBulkDeletePermanently'],
) {
  const handleBulkDeletePermanently = useCallback(() => {
    const paths = [...multiSelect.selectedPaths]
    multiSelect.clear()
    onBulkDeletePermanently?.(paths)
  }, [multiSelect, onBulkDeletePermanently])

  return { handleBulkDeletePermanently }
}

interface UseNoteListContentParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  modifiedFiles?: ModifiedFile[]
  modifiedSuffixes: string[]
  modifiedPathSet: Set<string>
  selectedNotePath: string | null
  visibleNotesRef?: React.MutableRefObject<VaultEntry[]>
  allNotesFileVisibility?: AllNotesFileVisibility
}

function useFilteredNoteListSearch({
  entries,
  sortedEntries,
  query,
  dateDisplayFormat,
}: {
  entries: VaultEntry[]
  sortedEntries: VaultEntry[]
  query: string
  dateDisplayFormat: ReturnType<typeof useDateDisplayFormat>
}) {
  const fullTextSearch = useNoteListFullTextSearch(entries, query)
  const searchContext = useMemo(
    () => ({
    allEntries: entries,
    dateDisplayFormat,
    fullTextResultPaths: fullTextSearch.resultPaths,
    }),
    [dateDisplayFormat, entries, fullTextSearch.resultPaths],
  )
  const searched = useMemo(
    () => filterEntriesByNoteListQuery(sortedEntries, query, searchContext),
    [query, searchContext, sortedEntries],
  )
  return {
    isFullTextSearching: fullTextSearch.loading,
    searched,
  }
}

function useNoteListContent(options: UseNoteListContentParams) {
  const { entries, selection, modifiedFiles, modifiedSuffixes, modifiedPathSet, selectedNotePath, visibleNotesRef, allNotesFileVisibility } = options
  const dateDisplayFormat = useDateDisplayFormat()
  const { listSort, listDirection, handleSortChange, sortPrefs } = useNoteListSort()
  const {
        closeSearch,
        isSearching: isDebouncingSearch,
        query,
        search,
        searchInputRef,
        searchVisible,
        setSearch,
        toggleSearch,
      } = useNoteListSearchState()
      const {
        searched: sortedEntries,
      } = useNoteListData({
        entries,
        selection,
        query: '',
        listSort,
        listDirection,
        modifiedPathSet,
        modifiedSuffixes,
        modifiedFiles,
        allNotesFileVisibility,
      })
      const { isFullTextSearching, searched } = useFilteredNoteListSearch({
        entries,
        sortedEntries,
        query,
        dateDisplayFormat,
      })
      useVisibleNotesSync({
        visibleNotesRef,
        searched,
      })
      useLikelyNextPreload(searched, selectedNotePath)

      return {
        handleSortChange,
        isSearching: isDebouncingSearch || isFullTextSearching,
        listDirection,
        listSort,
        query,
        search,
        searchInputRef,
        searchVisible,
        searched,
        closeSearch,
        setSearch,
        sortPrefs,
        toggleSearch,
      }
    }

    interface UseNoteListInteractionStateParams {
      searched: VaultEntry[]
      selectedNotePath: string | null
      selection: SidebarSelection
      isChangesView: boolean
      searchVisible: boolean
      toggleSearch: () => void
      modifiedFiles?: ModifiedFile[]
      onReplaceActiveTab: (entry: VaultEntry) => void
      onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
      onOpenInNewWindow?: (entry: VaultEntry) => void
      onRenameFilename?: (path: string, newFilenameStem: string) => void
      onExportPdf?: (entry: VaultEntry) => void
      onRevealFile?: (path: string) => void
      onCopyFilePath?: (path: string) => void
      canCopyGitUrl?: (entry: VaultEntry) => boolean
      onCopyGitUrl?: (entry: VaultEntry) => void
      onAutoTriggerDiff?: () => void
      onDiscardFile?: (relativePath: string) => Promise<void>
      onCreateNote: (options?: ImmediateCreateOptions) => void
      onBulkDeletePermanently?: (paths: string[]) => void
      locale: AppLocale
    }

    function useNoteListInteractionState(options: UseNoteListInteractionStateParams) {
      const { searched, selectedNotePath, selection, isChangesView, searchVisible, toggleSearch, modifiedFiles, onReplaceActiveTab, onOpenDeletedNote, onOpenInNewWindow, onRenameFilename, onExportPdf, onRevealFile, onCopyFilePath, canCopyGitUrl, onCopyGitUrl, onAutoTriggerDiff, onDiscardFile, onCreateNote, onBulkDeletePermanently, locale } = options
  const changesContextMenu = useChangesContextMenu({
    isChangesView,
    onDiscardFile,
    modifiedFiles,
    locale,
  })
  const noteListContextMenu = useNoteListContextMenu({
    locale,
    onOpenInNewWindow,
    onRenameFilename,
    onExportPdf,
    onDeletePaths: onBulkDeletePermanently,
    onRevealFile,
    onCopyFilePath,
    canCopyGitUrl,
    onCopyGitUrl,
  })
  const {
        handleClickNote,
        handleCreateNote,
        handleListKeyDown,
        multiSelect,
        noteListKeyboard,
      } = useNoteListInteractions({
        searched,
        selectedNotePath,
        selection,
        isChangesView,
        searchVisible,
        toggleSearch,
        onReplaceActiveTab,
        onOpenDeletedNote,
        onOpenInNewWindow,
        onAutoTriggerDiff,
        onDiscardFile,
        openContextMenuForEntry: changesContextMenu.openContextMenuForEntry,
        onCreateNote,
      })
      const getChangeStatus = useChangeStatusResolver(isChangesView, modifiedFiles)
      const { handleBulkDeletePermanently } = useBulkActions(
        multiSelect,
        onBulkDeletePermanently,
      )

      return {
        changesContextMenu,
        getChangeStatus,
        handleBulkDeletePermanently,
        handleClickNote,
        handleCreateNote,
        handleListKeyDown,
        multiSelect,
        noteListContextMenu,
        noteListKeyboard,
      }
    }

    interface UseRenderItemParams {
      entries: VaultEntry[]
      selectedNotePath: string | null
      isChangesView: boolean
      onDiscardFile?: (relativePath: string) => Promise<void>
      resolvedGetNoteStatus: (path: string) => NoteStatus
      getChangeStatus: (path: string) => ModifiedFile['status'] | undefined
      handleClickNote: (entry: VaultEntry, event: React.MouseEvent) => void
      changesContextMenu?: ((entry: VaultEntry, event: React.MouseEvent) => void) | undefined
      noteListContextMenu?: ((entry: VaultEntry, event: React.MouseEvent) => void) | undefined
      multiSelect: MultiSelectState
      noteListKeyboard: { highlightedPath: string | null }
    }

    function useRenderItem(functionOptions: UseRenderItemParams) {
      const {
      entries,
      selectedNotePath,
      isChangesView,
      onDiscardFile,
      resolvedGetNoteStatus,
      getChangeStatus,
      handleClickNote,
      changesContextMenu,
      noteListContextMenu,
      multiSelect,
      noteListKeyboard,
  } = functionOptions
  const contextMenuHandler = isChangesView && onDiscardFile ? changesContextMenu : noteListContextMenu

  return useCallback(
    (entry: VaultEntry, options?: { forceSelected?: boolean }) =>
    isDeletedNoteEntry(entry) ? (
      <NoteItem
        key={entry.path}
        entry={entry}
        isSelected={options?.forceSelected || selectedNotePath === entry.path}
        isMultiSelected={multiSelect.selectedPaths.has(entry.path)}
        isHighlighted={entry.path === noteListKeyboard.highlightedPath}
        noteStatus={resolvedGetNoteStatus(entry.path)}
        changeStatus={getChangeStatus(entry.path)}
        allEntries={entries}
        onClickNote={handleClickNote}
        onContextMenu={contextMenuHandler}
      />
    ) : (
      <NoteItem
        key={entry.path}
        entry={entry}
        isSelected={options?.forceSelected || selectedNotePath === entry.path}
        isMultiSelected={multiSelect.selectedPaths.has(entry.path)}
        isHighlighted={entry.path === noteListKeyboard.highlightedPath}
        noteStatus={resolvedGetNoteStatus(entry.path)}
        changeStatus={getChangeStatus(entry.path)}
        allEntries={entries}
        onClickNote={handleClickNote}
        onPrefetch={prefetchNoteContent}
        onContextMenu={contextMenuHandler}
      />
      ),
    [
    contextMenuHandler,
    entries,
    getChangeStatus,
    handleClickNote,
    multiSelect.selectedPaths,
    noteListKeyboard.highlightedPath,
    resolvedGetNoteStatus,
    selectedNotePath,
    ],
  )
}

export interface NoteListProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  selectedNote: VaultEntry | null
  loading?: boolean
  modifiedFiles?: ModifiedFile[]
  modifiedFilesError?: string | null
  gitRepositories?: GitRepositoryOption[]
  selectedGitRepositoryPath?: string
  onGitRepositoryChange?: (path: string) => void
  getNoteStatus?: (path: string) => NoteStatus
  sidebarCollapsed?: boolean
  onSelectNote: (entry: VaultEntry) => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onCreateNote: (options?: ImmediateCreateOptions) => void
  onBulkDeletePermanently?: (paths: string[]) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  onExportPdf?: (entry: VaultEntry) => void
  onRevealFile?: (path: string) => void
  onCopyFilePath?: (path: string) => void
  canCopyGitUrl?: (entry: VaultEntry) => boolean
  onCopyGitUrl?: (entry: VaultEntry) => void
  onDiscardFile?: (relativePath: string) => Promise<void>
  onAutoTriggerDiff?: () => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  visibleNotesRef?: React.MutableRefObject<VaultEntry[]>
  allNotesFileVisibility?: AllNotesFileVisibility
  locale?: AppLocale
}

function buildNoteListLayoutModel(params: {
  selection: SidebarSelection
  sidebarCollapsed?: boolean
  loading: boolean
  modifiedFilesError?: string | null
  gitRepositories?: GitRepositoryOption[]
  selectedGitRepositoryPath?: string
  onGitRepositoryChange?: (path: string) => void
  locale: AppLocale
  content: ReturnType<typeof useNoteListContent> & {
    handleSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  }
  interaction: ReturnType<typeof useNoteListInteractionState> & {
    renderItem: (entry: VaultEntry, options?: { forceSelected?: boolean }) => React.ReactNode
  }
}) {
  return {
    title: resolveHeaderTitle(params.selection, params.locale),
    loading: params.loading,
    locale: params.locale,
    listSort: params.content.listSort,
    listDirection: params.content.listDirection,
    sidebarCollapsed: params.sidebarCollapsed,
    searchVisible: params.content.searchVisible,
    search: params.content.search,
    isSearching: params.content.isSearching,
    searchInputRef: params.content.searchInputRef,
    handleSortChange: params.content.handleSortChange,
    handleCreateNote: params.interaction.handleCreateNote,
    toggleSearch: params.content.toggleSearch,
    setSearch: params.content.setSearch,
    handleSearchKeyDown: params.content.handleSearchKeyDown,
    handleListKeyDown: params.interaction.handleListKeyDown,
    noteListPanelRef: params.interaction.noteListKeyboard.panelRef,
    handleNoteListPanelBlurCapture: params.interaction.noteListKeyboard.handlePanelBlurCapture,
    handleNoteListPanelFocusCapture: params.interaction.noteListKeyboard.handlePanelFocusCapture,
    noteListContainerRef: params.interaction.noteListKeyboard.containerRef,
    handleNoteListBlur: params.interaction.noteListKeyboard.handleBlur,
    handleNoteListFocus: params.interaction.noteListKeyboard.handleFocus,
    focusNoteList: params.interaction.noteListKeyboard.focusList,
    noteListVirtuosoRef: params.interaction.noteListKeyboard.virtuosoRef,
    sortPrefs: params.content.sortPrefs,
    renderItem: params.interaction.renderItem,
    handleClickNote: params.interaction.handleClickNote,
    isChangesView: params.selection.kind === 'filter' && params.selection.filter === 'changes',
    gitRepositories: params.gitRepositories ?? [],
    selectedGitRepositoryPath: params.selectedGitRepositoryPath ?? '',
    onGitRepositoryChange: params.onGitRepositoryChange,
    modifiedFilesError: params.modifiedFilesError,
    searched: params.content.searched,
    query: params.content.query,
    multiSelect: params.interaction.multiSelect,
    handleBulkDeletePermanently: params.interaction.handleBulkDeletePermanently,
    contextMenuNode: (
      <>
        {params.interaction.changesContextMenu.contextMenuNode}
        {params.interaction.noteListContextMenu.contextMenuNode}
      </>
    ),
    dialogNode: params.interaction.changesContextMenu.dialogNode,
  }
}

export function useNoteListModel(options: NoteListProps) {
  const { entries, selection, selectedNote, loading = false, modifiedFiles, modifiedFilesError, gitRepositories, selectedGitRepositoryPath, onGitRepositoryChange, getNoteStatus, sidebarCollapsed, onReplaceActiveTab, onCreateNote, onBulkDeletePermanently, onOpenInNewWindow, onRenameFilename, onExportPdf, onRevealFile, onCopyFilePath, canCopyGitUrl, onCopyGitUrl, onDiscardFile, onAutoTriggerDiff, onOpenDeletedNote, visibleNotesRef, allNotesFileVisibility, locale = 'en' } = options
  const selectedNotePath = selectedNote?.path ?? null
  const { modifiedPathSet, modifiedSuffixes, resolvedGetNoteStatus } = useModifiedFilesState(
    modifiedFiles,
    getNoteStatus,
  )
  const content = useNoteListContent({
    entries,
    selection,
    modifiedFiles,
    modifiedSuffixes,
    modifiedPathSet,
    selectedNotePath,
    visibleNotesRef,
    allNotesFileVisibility,
  })
  const interaction = useNoteListInteractionState({
    searched: content.searched,
    selectedNotePath,
    selection,
    isChangesView: selection.kind === 'filter' && selection.filter === 'changes',
    searchVisible: content.searchVisible,
    toggleSearch: content.toggleSearch,
    modifiedFiles,
    onReplaceActiveTab,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onRenameFilename,
    onExportPdf,
    onRevealFile,
    onCopyFilePath,
    canCopyGitUrl,
    onCopyGitUrl,
    onAutoTriggerDiff,
    onDiscardFile,
    onCreateNote,
    onBulkDeletePermanently,
    locale,
  })
  const renderItem = useRenderItem({
    entries,
    selectedNotePath,
    isChangesView: selection.kind === 'filter' && selection.filter === 'changes',
    onDiscardFile,
    resolvedGetNoteStatus,
    getChangeStatus: interaction.getChangeStatus,
    handleClickNote: interaction.handleClickNote,
    changesContextMenu: interaction.changesContextMenu.handleNoteContextMenu,
    noteListContextMenu: interaction.noteListContextMenu.handleNoteContextMenu,
    multiSelect: interaction.multiSelect,
    noteListKeyboard: interaction.noteListKeyboard,
  })
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return

    event.preventDefault()
    content.closeSearch()
    requestAnimationFrame(() => {
      interaction.noteListKeyboard.focusList()
    })
  }
  const { isPanelActive: isNoteListSearchActive, toggleSearchShortcut } = interaction.noteListKeyboard

  useEffect(() => {
    dispatchNoteListSearchAvailability(isNoteListSearchActive)
    return () => dispatchNoteListSearchAvailability(false)
  }, [isNoteListSearchActive])

  useEffect(() => {
    return addNoteListSearchToggleListener(() => {
      if (!isNoteListSearchActive) return
      toggleSearchShortcut()
    })
  }, [isNoteListSearchActive, toggleSearchShortcut])

  return buildNoteListLayoutModel({
    selection,
    sidebarCollapsed,
    loading,
    modifiedFilesError,
    gitRepositories,
    selectedGitRepositoryPath,
    onGitRepositoryChange,
    locale,
    content: {
      ...content,
      handleSearchKeyDown,
    },
    interaction: {
      ...interaction,
      renderItem,
    },
  })
}
