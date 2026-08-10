import type React from 'react'
import { useMemo, useRef } from 'react'
import type { useCreateBlockNote } from '@blocknote/react'
import type { AppLocale } from '../../lib/i18n'
import type { NoteWidthMode, VaultEntry } from '../../types'
import { useEditorTheme } from '../../hooks/useTheme'
import { deriveEditorContentState } from './editorContentState'
import type { RawEditorFindRequest } from '../RawEditorFindBar'
import type { ImageImportError } from '../../hooks/useImageDrop'

export interface Tab {
  entry: VaultEntry
  content: string
}

export interface EditorContentProps {
  activeTab: Tab | null
  activeTabPath: string | null
  isLoadingNewTab: boolean
  isVaultLoading?: boolean
  entries: VaultEntry[]
  editor: ReturnType<typeof useCreateBlockNote>
  richEditorContentReady: boolean
  rawMode: boolean
  onToggleRaw: () => void
  onRawContentChange?: (path: string, content: string) => void
  onSave?: () => void
  showTableOfContents?: boolean
  onToggleTableOfContents?: () => void
  onNavigateWikilink: (target: string) => void
  onEditorChange?: () => void
  onRevealFile?: (path: string) => void
  onCopyFilePath?: (path: string) => void
  onCopyDeepLink?: (entry: VaultEntry) => void
  onExportPdf?: () => void
  onDeleteNote?: (path: string) => void
  vaultPath?: string
  rawModeContent?: string | null
  findRequest?: RawEditorFindRequest | null
  rawLatestContentRef?: React.MutableRefObject<string | null>
  sheetFlushRef?: React.MutableRefObject<((path: string) => void) | null>
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  noteWidth?: NoteWidthMode
  onToggleNoteWidth?: () => void
  onImageImportError?: (error: ImageImportError) => void
  locale?: AppLocale
}

export function useEditorContentModel(props: EditorContentProps) {
  const {
    activeTab,
    activeTabPath,
    entries,
    rawMode,
  } = props

  const { cssVars } = useEditorTheme()
  const {
    isDeletedPreview,
    isHtmlPreview,
    isSheet,
    isNonMarkdownText,
    effectiveRawMode,
    showEditor: showContentEditor,
    path,
    wordCount,
  } = useMemo(() => deriveEditorContentState({
    activeTab,
    entries,
    rawMode,
  }), [activeTab, entries, rawMode])
  const showEditor = showContentEditor
  const loadingEntry = !activeTab && activeTabPath
    ? entries.find((entry) => entry.path === activeTabPath) ?? null
    : null
  const loadingTab = loadingEntry ? { entry: loadingEntry, content: '' } : null

  const breadcrumbBarRef = useRef<HTMLDivElement | null>(null)

  return {
    ...props,
    cssVars,
    isDeletedPreview,
    isHtmlPreview,
    isSheet,
    effectiveRawMode,
    forceRawMode: isNonMarkdownText || isDeletedPreview,
    showEditor,
    loadingTab,
    path,
    breadcrumbBarRef,
    wordCount,
  }
}
