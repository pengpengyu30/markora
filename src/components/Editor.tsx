import { useRef, useEffect, useCallback, memo, useMemo, useState } from 'react'
import { useEditorTabSwap } from '../hooks/useEditorTabSwap'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/mantine/style.css'
import 'katex/dist/katex.min.css'
import {
  emptyImageUploadResult,
  isUnsupportedImageFormatError,
  uploadImageFile,
  type ImageImportError,
  type UploadImageFileResult,
} from '../hooks/useImageDrop'
import { translate, type AppLocale } from '../lib/i18n'
import { RUNTIME_STYLE_NONCE } from '../lib/runtimeStyleNonce'
import type { VaultEntry, NoteWidthMode } from '../types'
import { ResizeHandle } from './ResizeHandle'
import { useEditorFocus } from '../hooks/useEditorFocus'
import { useDragRegion } from '../hooks/useDragRegion'
import { formatShortcutDisplay } from '../hooks/appCommandCatalog'
import { EditorRightPanel } from './EditorRightPanel'
import { EditorContent } from './EditorContent'
import { EditorMemoryProbe } from './EditorMemoryProbe'
import { FilePreview } from './FilePreview'
import { schema } from './editorSchema'
import { useRightPanelExclusion } from './useRightPanelExclusion'
import type { RawEditorFindRequest } from './RawEditorFindBar'
import { applyPendingRawExitContent, resolvePendingRawExitContent, resolveRawModeContent } from './editorRawModeSync'
import { deriveEditorContentState } from './editor-content/editorContentState'
import { useRegisterEditorContentFlushes } from './editorContentFlushRegistration'
import { useRawModeWithFlush } from './useRawModeWithFlush'
import { createImeCompositionKeyGuardExtension } from './imeCompositionKeyGuardExtension'
import { createMarkdownHighlightShortcutExtension } from './markdownHighlightShortcutExtension'
import { handleRemoteRichEditorPaste } from './richEditorPaste'
import { createRichEditorMarkdownInputTransformExtension } from './richEditorInputTransformExtension'
import { createRichEditorTextDirectionExtension } from './richEditorTextDirection'
import { createRichEditorTransformErrorRecoveryExtension } from './richEditorTransformErrorRecoveryExtension'
import { createRichEditorBlockSelectionExtension } from './richEditorBlockSelectionExtension'
import { createTodoBlockShortcutExtension } from './todoBlockShortcutExtension'
import { createRichEditorCodeBlockTabExtension } from './richEditorCodeBlockTabExtension'
import { createRichEditorCodeBlockShortcutExtension } from './richEditorCodeBlockShortcutExtension'
import { createRichEditorCodeBlockArrowNavigationExtension } from './richEditorCodeBlockArrowNavigationExtension'
import { createRichEditorEmptyListNavigationExtension } from './richEditorEmptyListNavigationExtension'
import { createRichEditorListTabExtension } from './richEditorListTabExtension'
import { useFilenameAutolinkGuard } from './useFilenameAutolinkGuard'
import { useEditorPdfExport } from './useEditorPdfExport'
import type { NotePdfExportSource } from '../utils/notePdfExport'
import type { RichEditorBlockTypeDefinition } from '../utils/richEditorBlockTypes'
import { installRichEditorMarkdownSerializer } from '../utils/richEditorMarkdown'
import { installRichEditorDispatchPerformanceProbe } from './richEditorDispatchPerformance'
import { RICH_EDITOR_BLOCKNOTE_PERFORMANCE_OPTIONS } from './richEditorBlockNoteOptions'
import { markStartupPhase } from '../lib/startupPerformance'
import { useTurnCurrentBlockIntoCommand } from './useTurnCurrentBlockIntoCommand'
import './Editor.css'
import './EditorTheme.css'

const RICH_EDITOR_BIDI_DOM_ATTRIBUTES = {
  blockContent: { dir: 'auto' },
  inlineContent: { dir: 'auto' },
}

interface Tab {
  entry: VaultEntry
  content: string
}

export interface EditorProps {
  tabs: Tab[]
  activeTabPath: string | null
  isVaultLoading?: boolean
  entries: VaultEntry[]
  onNavigateWikilink: (target: string) => void
  onCreateNote?: () => void
  rightPanelCollapsed: boolean
  onToggleRightPanel: () => void
  rightPanelWidth: number
  onRightPanelResize: (delta: number) => void
  rightPanelEntry: VaultEntry | null
  rightPanelContent: string | null
  vaultPath?: string
  onRevealFile?: (path: string) => void
  onCopyFilePath?: (path: string) => void
  onOpenExternalFile?: (path: string) => void
  onDeleteNote?: (path: string) => void
  onContentChange?: (path: string, content: string) => void
  onSave?: () => void
  /** Called when the user explicitly renames the filename from the breadcrumb. */
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  noteWidth?: NoteWidthMode
  onToggleNoteWidth?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onGoBack?: () => void
  onGoForward?: () => void
  leftPanelsCollapsed?: boolean
  /** Mutable ref that Editor registers its raw-mode toggle into, for command palette access. */
  rawToggleRef?: React.MutableRefObject<() => void>
  /** Mutable ref that Editor registers editor find commands into, for shortcuts and menus. */
  findInNoteRef?: React.MutableRefObject<((options?: { replace?: boolean }) => void) | null>
  /** Mutable ref that Editor registers its table-of-contents toggle into, for app shortcuts and menus. */
  tableOfContentsToggleRef?: React.MutableRefObject<() => void>
  /** Mutable ref that Editor registers its backlinks toggle into, for app commands and menus. */
  backlinksToggleRef?: React.MutableRefObject<() => void>
  /** Mutable ref that Editor registers the PDF export command into, for command palette and native menu access. */
  pdfExportRef?: React.MutableRefObject<((source?: NotePdfExportSource) => void) | null>
  /** Mutable ref that Editor registers focused-block type changes into, for command palette access. */
  turnCurrentBlockIntoRef?: React.MutableRefObject<((target: RichEditorBlockTypeDefinition) => void) | null>
  /** Emits short user-visible messages for editor actions. */
  onToast?: (message: string | null) => void
  /** Registers a hook that flushes pending rich-editor changes into app state before external actions. */
  flushPendingEditorContentRef?: React.MutableRefObject<((path: string) => void) | null>
  /** Registers a hook that flushes the raw editor buffer into app state before external actions. */
  flushPendingRawContentRef?: React.MutableRefObject<((path: string) => void) | null>
  locale?: AppLocale
}

type ImageImportErrorHandler = (error: ImageImportError) => void

function EditorEmptyState({ locale = 'en' }: { locale?: AppLocale }) {
  const breadcrumbBarHeight = 52
  const { onMouseDown } = useDragRegion()
  const quickOpenShortcut = formatShortcutDisplay({ display: '⌘P / ⌘O' })
  const newNoteShortcut = formatShortcutDisplay({ display: '⌘N' })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        data-tauri-drag-region
        data-testid="editor-empty-state-drag-region"
        className="shrink-0"
        onMouseDown={onMouseDown}
        style={{ height: breadcrumbBarHeight }}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="m-0 text-[15px]">{translate(locale, 'editor.empty.selectNote')}</p>
        <span className="text-xs text-muted-foreground">
          {translate(locale, 'editor.empty.shortcuts', {
            quickOpen: quickOpenShortcut,
            newNote: newNoteShortcut,
          })}
        </span>
      </div>
    </div>
  )
}

interface EditorSetupParams {
  tabs: Tab[]
  activeTabPath: string | null
  vaultPath?: string
  onContentChange?: (path: string, content: string) => void
  rawToggleRef?: React.MutableRefObject<() => void>
  onImageImportError?: ImageImportErrorHandler
}

function imageImportErrorMessage(error: ImageImportError, locale: AppLocale | undefined): string {
  if (error.kind === 'remote-download') {
    return translate(locale ?? 'en', 'editor.imageImport.remoteDownloadFailed', {
      failedCount: error.failedCount,
      totalCount: error.totalCount,
    })
  }
  return translate(locale ?? 'en', 'editor.imageImport.unsupportedHeic', {
    filename: error.fileName,
  })
}

function handleEditorImageUploadFailure(
  file: File,
  error: unknown,
  onImageImportError: ImageImportErrorHandler | undefined,
): UploadImageFileResult {
  if (!isUnsupportedImageFormatError(error)) throw error

  onImageImportError?.(error)
  return emptyImageUploadResult(file)
}

function useEditorSetup(options: EditorSetupParams) {
  const {
    tabs,
    activeTabPath,
    vaultPath,
    onContentChange,
    rawToggleRef,
    onImageImportError,
  } = options
  const vaultPathRef = useRef(vaultPath)
  const activeTabPathRef = useRef(activeTabPath)
  const onImageImportErrorRef = useRef(onImageImportError)
  const flushPendingEditorChangeRef = useRef<(() => boolean) | null>(null)
  useEffect(() => {
    vaultPathRef.current = vaultPath
  }, [vaultPath])
  useEffect(() => {
    activeTabPathRef.current = activeTabPath
  }, [activeTabPath])
  useEffect(() => {
    onImageImportErrorRef.current = onImageImportError
  }, [onImageImportError])

  const editor = useCreateBlockNote({
    ...RICH_EDITOR_BLOCKNOTE_PERFORMANCE_OPTIONS,
    schema,
    domAttributes: RICH_EDITOR_BIDI_DOM_ATTRIBUTES,
    uploadFile: async (file: File) => {
      try {
        return await uploadImageFile(file, vaultPathRef.current)
      } catch (error) {
        return handleEditorImageUploadFailure(file, error, onImageImportErrorRef.current)
      }
    },
    pasteHandler: (context) => {
      const pastePath = activeTabPathRef.current
      return handleRemoteRichEditorPaste(context, {
        canApply: () => activeTabPathRef.current === pastePath,
        vaultPath: vaultPathRef.current,
        onImportResult: ({ failedCount, totalCount }) => {
          if (failedCount > 0) {
            onImageImportErrorRef.current?.({
              failedCount,
              kind: 'remote-download',
              totalCount,
            })
          }
        },
      })
    },
    tabBehavior: 'prefer-indent',
    _tiptapOptions: { injectNonce: RUNTIME_STYLE_NONCE },
    extensions: [
      createRichEditorTransformErrorRecoveryExtension(),
      createImeCompositionKeyGuardExtension(),
      createRichEditorCodeBlockArrowNavigationExtension(),
      createRichEditorEmptyListNavigationExtension(),
      createRichEditorCodeBlockTabExtension(),
      createRichEditorListTabExtension(),
      createRichEditorCodeBlockShortcutExtension(),
      createMarkdownHighlightShortcutExtension(),
      createTodoBlockShortcutExtension(),
      createRichEditorMarkdownInputTransformExtension(),
      createRichEditorTextDirectionExtension(),
      createRichEditorBlockSelectionExtension(),
    ],
  })
  installRichEditorMarkdownSerializer(editor)
  useEffect(() => {
    installRichEditorDispatchPerformanceProbe(editor, () => activeTabPathRef.current)
  }, [editor])
  useFilenameAutolinkGuard(editor)
  const activeTab = tabs.find((t) => t.entry.path === activeTabPath) ?? null
  const {
        rawMode,
        handleToggleRaw,
        rawLatestContentRef,
        pendingRawExitContent,
        setPendingRawExitContent,
        rawModeContentOverride,
      } = useRawModeWithFlush(
        editor,
        activeTabPath,
        activeTab?.content ?? null,
        onContentChange,
        vaultPath,
        flushPendingEditorChangeRef,
      )
      const rawModeContent = resolveRawModeContent({
        activeTab,
        rawModeContentOverride,
      })

      useEffect(() => {
        setPendingRawExitContent((current) =>
          resolvePendingRawExitContent({
          activeTabPath,
          tabs,
          pendingRawExitContent: current,
          }),
        )
      }, [activeTabPath, setPendingRawExitContent, tabs])

      const tabsForEditorSwap = useMemo(
        () => applyPendingRawExitContent(tabs, pendingRawExitContent),
        [pendingRawExitContent, tabs],
      )
      const richEditorTab = tabsForEditorSwap.find((tab) => tab.entry.path === activeTabPath) ?? null
      const richEditorState = richEditorTab
        ? deriveEditorContentState({
          activeTab: richEditorTab,
          entries: tabsForEditorSwap.map((tab) => tab.entry),
          rawMode: false,
        })
        : null
      const richEditorTabUnavailable = Boolean(
        richEditorState?.isHtmlFile || richEditorState?.legacyUnsupportedKind,
      )

      const { editorContentPath, handleEditorChange, flushPendingEditorChange, editorMountedRef } = useEditorTabSwap({
        tabs: tabsForEditorSwap,
        activeTabPath: richEditorTabUnavailable ? null : activeTabPath,
        editor,
        onContentChange,
        rawMode,
        vaultPath,
      })
      const richEditorContentReady = richEditorTabUnavailable
        || !activeTab
        || editorContentPath === null
        || editorContentPath === activeTab.entry.path
      useEffect(() => {
        if (richEditorContentReady) markStartupPhase('editor_interactive')
      }, [richEditorContentReady])
      useEffect(() => {
        flushPendingEditorChangeRef.current = flushPendingEditorChange
        return () => {
          if (flushPendingEditorChangeRef.current === flushPendingEditorChange) {
            flushPendingEditorChangeRef.current = null
          }
        }
      }, [flushPendingEditorChange])
      useEditorFocus(editor, editorMountedRef)

      const handleToggleRawExclusive = useCallback(() => {
        handleToggleRaw()
      }, [handleToggleRaw])
      useEffect(() => {
        if (!rawToggleRef) return
        rawToggleRef.current = handleToggleRawExclusive
        return () => {
          if (rawToggleRef.current === handleToggleRawExclusive) rawToggleRef.current = () => {}
        }
      }, [handleToggleRawExclusive, rawToggleRef])

      const isLoadingNewTab = activeTabPath !== null && !activeTab

      return {
        editor,
        activeTab,
        rawLatestContentRef,
        rawModeContent,
        rawMode,
        handleToggleRawExclusive,
        handleEditorChange,
        flushPendingEditorChange,
        isLoadingNewTab,
        richEditorContentReady,
      }
    }

    function useEditorFindCommand({
      activeTab,
      findInNoteRef,
      handleToggleRawExclusive,
      rawMode,
    }: {
      activeTab: Tab | null
      findInNoteRef?: EditorProps['findInNoteRef']
      handleToggleRawExclusive: () => void
      rawMode: boolean
    }): RawEditorFindRequest | null {
      const [findRequest, setFindRequest] = useState<RawEditorFindRequest | null>(null)
      const handleFindInNote = useCallback(
        (options: { replace?: boolean } = {}) => {
        if (!activeTab || activeTab.entry.fileKind === 'binary') return
        if (!rawMode) handleToggleRawExclusive()

        setFindRequest((current) => ({
          id: (current?.id ?? 0) + 1,
          path: activeTab.entry.path,
          replace: options.replace === true,
        }))
        },
        [activeTab, handleToggleRawExclusive, rawMode],
      )

      useEffect(() => {
        if (!findInNoteRef) return

        findInNoteRef.current = handleFindInNote
        return () => {
          if (findInNoteRef.current === handleFindInNote) {
            findInNoteRef.current = null
          }
        }
      }, [findInNoteRef, handleFindInNote])

      return findRequest
    }

    function EditorLayout(options: {
      tabs: Tab[]
      activeTabPath: string | null
      activeTab: Tab | null
      isLoadingNewTab: boolean
      isVaultLoading?: boolean
      entries: VaultEntry[]
      editor: ReturnType<typeof useCreateBlockNote>
      richEditorContentReady: boolean
      rawMode: boolean
      handleToggleRawExclusive: () => void
      onContentChange?: (path: string, content: string) => void
      onSave?: () => void
      showTableOfContents?: boolean
      showBacklinks?: boolean
      onToggleTableOfContents?: () => void
      rightPanelCollapsed: boolean
      onNavigateWikilink: (target: string) => void
      handleEditorChange: () => void
      onRevealFile?: (path: string) => void
      onCopyFilePath?: (path: string) => void
      onOpenExternalFile?: (path: string) => void
      onDeleteNote?: (path: string) => void
      vaultPath?: string
      rawModeContent: string | null
      findRequest?: RawEditorFindRequest | null
      rawLatestContentRef: React.MutableRefObject<string | null>
      onRenameFilename?: (path: string, newFilenameStem: string) => void
      noteWidth?: NoteWidthMode
      onToggleNoteWidth?: () => void
      onRightPanelResize: (delta: number) => void
      rightPanelWidth: number
      rightPanelEntry: VaultEntry | null
      rightPanelContent: string | null
      onToggleBacklinks?: () => void
      onImageImportError?: ImageImportErrorHandler
      locale?: AppLocale
      onExportPdf?: (source?: NotePdfExportSource) => void
    }) {
      const {
      tabs,
      activeTabPath,
      activeTab,
      isLoadingNewTab,
      isVaultLoading,
      entries,
      editor,
      richEditorContentReady,
      rawMode,
      handleToggleRawExclusive,
      onContentChange,
      onSave,
      showTableOfContents,
      showBacklinks,
      onToggleTableOfContents,
      rightPanelCollapsed,
      onNavigateWikilink,
      handleEditorChange,
      onRevealFile,
      onCopyFilePath,
      onExportPdf,
      onOpenExternalFile,
      onDeleteNote,
      vaultPath,
      rawModeContent,
      findRequest,
      rawLatestContentRef,
      onRenameFilename,
      noteWidth,
      onToggleNoteWidth,
      onRightPanelResize,
      rightPanelWidth,
      rightPanelEntry,
      rightPanelContent,
      onToggleBacklinks,
      onImageImportError,
      locale,
  } = options
  const activeBinaryTab = activeTab?.entry.fileKind === 'binary' ? activeTab : null
  const showEmptyState = tabs.length === 0 && activeTabPath === null && !isVaultLoading

  return (
    <div className="editor flex flex-col min-h-0 overflow-hidden bg-background text-foreground">
      <div className="relative flex flex-1 min-h-0">
        {showEmptyState ? (
          <EditorEmptyState locale={locale} />
        ) : activeBinaryTab ? (
                <FilePreview
                  key={activeBinaryTab.entry.path}
                  entry={activeBinaryTab.entry}
                  locale={locale}
                  onCopyFilePath={onCopyFilePath}
                  onOpenExternalFile={onOpenExternalFile}
                  onRevealFile={onRevealFile}
                />
        ) : (
          <EditorContent
              activeTab={activeTab}
              activeTabPath={activeTabPath}
              isLoadingNewTab={isLoadingNewTab}
              isVaultLoading={isVaultLoading}
              entries={entries}
              editor={editor}
              richEditorContentReady={richEditorContentReady}
              rawMode={rawMode}
              onToggleRaw={handleToggleRawExclusive}
              onRawContentChange={onContentChange}
              onSave={onSave}
              showTableOfContents={showTableOfContents}
              onToggleTableOfContents={onToggleTableOfContents}
              onNavigateWikilink={onNavigateWikilink}
              onEditorChange={handleEditorChange}
              onRevealFile={onRevealFile}
              onCopyFilePath={onCopyFilePath}
              onOpenExternalFile={onOpenExternalFile}
              onExportPdf={() => onExportPdf?.('breadcrumb')}
              onDeleteNote={onDeleteNote}
              vaultPath={vaultPath}
              rawModeContent={rawModeContent}
              findRequest={findRequest}
              rawLatestContentRef={rawLatestContentRef}
              onRenameFilename={onRenameFilename}
              noteWidth={noteWidth}
              onToggleNoteWidth={onToggleNoteWidth}
              onImageImportError={onImageImportError}
              locale={locale}
            />
        )}
        {(showTableOfContents || showBacklinks || !rightPanelCollapsed) && <ResizeHandle onResize={onRightPanelResize} />}
        <EditorRightPanel
          showTableOfContents={showTableOfContents}
          showBacklinks={showBacklinks}
          rightPanelCollapsed={rightPanelCollapsed}
          rightPanelWidth={rightPanelWidth}
          editor={editor}
          entry={rightPanelEntry}
          content={rightPanelContent}
          entries={entries}
          onToggleTableOfContents={onToggleTableOfContents}
          onNavigateWikilink={onNavigateWikilink}
          onToggleBacklinks={onToggleBacklinks}
          locale={locale}
        />
      </div>
      <EditorMemoryProbe entries={entries} vaultPath={vaultPath} locale={locale} />
    </div>
  )
}

type EditorRuntime = ReturnType<typeof useEditorSetup>
type EditorLayoutProps = Parameters<typeof EditorLayout>[0]

function buildEditorLayoutProps(
  props: EditorProps,
  runtime: EditorRuntime,
  findRequest: RawEditorFindRequest | null,
): EditorLayoutProps {
  return {
    ...props,
    ...runtime,
    activeTabPath: props.activeTabPath,
    findRequest,
  }
}

export const Editor = memo(function Editor(props: EditorProps) {
  const { locale, onToast } = props
  const handleImageImportError = useCallback(
    (error: ImageImportError) => {
    onToast?.(imageImportErrorMessage(error, locale))
    },
    [locale, onToast],
  )
  const runtime = useEditorSetup({
    tabs: props.tabs,
    activeTabPath: props.activeTabPath,
    vaultPath: props.vaultPath,
    onContentChange: props.onContentChange,
    rawToggleRef: props.rawToggleRef,
    onImageImportError: handleImageImportError,
  })
  const findRequest = useEditorFindCommand({
    activeTab: runtime.activeTab,
    findInNoteRef: props.findInNoteRef,
    handleToggleRawExclusive: runtime.handleToggleRawExclusive,
    rawMode: runtime.rawMode,
  })
  useTurnCurrentBlockIntoCommand({
    activeTab: runtime.activeTab,
    editor: runtime.editor,
    rawMode: runtime.rawMode,
    turnCurrentBlockIntoRef: props.turnCurrentBlockIntoRef,
  })
  const handleExportPdf = useEditorPdfExport({
    activeTab: runtime.activeTab,
    handleToggleRawExclusive: runtime.handleToggleRawExclusive,
    locale: props.locale,
    onToast: props.onToast,
    pdfExportRef: props.pdfExportRef,
    rawMode: runtime.rawMode,
  })
  useRegisterEditorContentFlushes({
    activeTab: runtime.activeTab,
    flushPendingEditorChange: runtime.flushPendingEditorChange,
    flushPendingEditorContentRef: props.flushPendingEditorContentRef,
    rawLatestContentRef: runtime.rawLatestContentRef,
    rawMode: runtime.rawMode,
    onContentChange: props.onContentChange,
    flushPendingRawContentRef: props.flushPendingRawContentRef,
  })
  const rightPanel = useRightPanelExclusion(props)
  const { backlinksToggleRef, tableOfContentsToggleRef } = props
  useEffect(() => {
    if (tableOfContentsToggleRef) {
      tableOfContentsToggleRef.current = rightPanel.handleToggleTableOfContents
    }
  }, [tableOfContentsToggleRef, rightPanel.handleToggleTableOfContents])
  useEffect(() => {
    if (backlinksToggleRef) {
      backlinksToggleRef.current = rightPanel.handleToggleBacklinks
    }
  }, [backlinksToggleRef, rightPanel.handleToggleBacklinks])

  return (
    <EditorLayout
      {...buildEditorLayoutProps(props, runtime, findRequest)}
      onImageImportError={handleImageImportError}
      showTableOfContents={rightPanel.showTableOfContents}
      showBacklinks={rightPanel.showBacklinks}
      onToggleTableOfContents={rightPanel.handleToggleTableOfContents}
      onToggleBacklinks={rightPanel.handleToggleBacklinks}
      onExportPdf={handleExportPdf}
    />
  )
})
