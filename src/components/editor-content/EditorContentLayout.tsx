import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { AppLocale } from '../../lib/i18n'
import type { VaultEntry } from '../../types'
import { useEditorFocusScope } from '../../hooks/editorFocusOwnership'
import { dispatchEditorFindAvailability } from '../../utils/editorFindEvents'
import { BreadcrumbBar } from '../BreadcrumbBar'
import { FilePreview } from '../FilePreview'
import { RawEditorView } from '../RawEditorView'
import { SingleEditorView } from '../SingleEditorView'
import type { useEditorContentModel } from './useEditorContentModel'

type EditorContentModel = ReturnType<typeof useEditorContentModel>

type BreadcrumbActions = Pick<
  EditorContentModel,
  | 'effectiveRawMode'
  | 'onToggleRaw'
  | 'forceRawMode'
  | 'showTableOfContents'
  | 'onToggleTableOfContents'
  | 'onRevealFile'
  | 'onCopyFilePath'
  | 'onExportPdf'
  | 'onDeleteNote'
  | 'onRenameFilename'
  | 'noteWidth'
  | 'onToggleNoteWidth'
  | 'availableTags'
  | 'onUpdateTags'
>

const LOADING_BREADCRUMB_ENTRY: VaultEntry = {
  path: '',
  filename: 'loading.md',
  title: '',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
  archived: false,
  modifiedAt: null,
  createdAt: null,
  fileSize: 0,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  sidebarLabel: null,
  template: null,
  sort: null,
  view: null,
  visible: true,
  organized: false,
  favorite: false,
  favoriteIndex: null,
  listPropertiesDisplay: [],
  outgoingLinks: [],
  properties: {},
  hasH1: false,
  fileKind: 'markdown',
}

function RawModeEditorSection(
  options: Pick<
    EditorContentModel,
    | 'activeTab'
    | 'entries'
    | 'findRequest'
    | 'onImageImportError'
    | 'onRawContentChange'
    | 'onSave'
    | 'rawLatestContentRef'
    | 'rawModeContent'
    | 'vaultPath'
  > & {
    rawMode: boolean
    locale?: AppLocale
  },
) {
  const {
    activeTab,
    entries,
    findRequest,
    rawMode,
    rawModeContent,
    onRawContentChange,
    onImageImportError,
    onSave,
    rawLatestContentRef,
    vaultPath,
    locale,
  } = options
  if (!rawMode || !activeTab) return null

  return (
    <EditorFindScope className="editor-scroll-area">
      <RawEditorView
        key={activeTab.entry.path}
        content={rawModeContent ?? activeTab.content}
        path={activeTab.entry.path}
        entries={entries}
        findRequest={findRequest}
        onContentChange={onRawContentChange ?? (() => {})}
        onImageImportResult={({ failedCount, totalCount }) => {
          if (failedCount > 0) {
            onImageImportError?.({
              failedCount,
              kind: 'remote-download',
              totalCount,
            })
          }
        }}
        onSave={onSave ?? (() => {})}
        latestContentRef={rawLatestContentRef}
        vaultPath={vaultPath}
        locale={locale}
      />
    </EditorFindScope>
  )
}

function bindPath(cb: ((path: string) => void) | undefined, path: string) {
  return cb ? () => cb(path) : undefined
}

function ActiveTabBreadcrumb({
  activeTab,
  barRef,
  wordCount,
  path,
  actions,
  locale,
  loadingTitle,
}: {
  activeTab: NonNullable<EditorContentModel['activeTab']>
  barRef: React.RefObject<HTMLDivElement | null>
  wordCount: number
  path: string
  actions: BreadcrumbActions
  locale?: AppLocale
  loadingTitle?: boolean
}) {
  return (
    <BreadcrumbBar
      entry={activeTab.entry}
      content={activeTab.content}
      wordCount={wordCount}
      barRef={barRef}
      loadingTitle={loadingTitle}
      rawMode={actions.effectiveRawMode}
      onToggleRaw={actions.onToggleRaw}
      forceRawMode={actions.forceRawMode}
      showTableOfContents={actions.showTableOfContents}
      onToggleTableOfContents={actions.onToggleTableOfContents}
      onRevealFile={actions.onRevealFile}
      onCopyFilePath={actions.onCopyFilePath}
      onExportPdf={actions.onExportPdf}
      onDelete={bindPath(actions.onDeleteNote, path)}
      onRenameFilename={actions.onRenameFilename}
      noteWidth={actions.noteWidth}
      onToggleNoteWidth={actions.onToggleNoteWidth}
      availableTags={actions.availableTags}
      onUpdateTags={actions.onUpdateTags}
      locale={locale}
    />
  )
}

function EditorLoadingBreadcrumb({
  actions,
  barRef,
  locale,
}: {
  actions: BreadcrumbActions
  barRef: React.RefObject<HTMLDivElement | null>
  locale?: AppLocale
}) {
  return (
    <BreadcrumbBar
      entry={LOADING_BREADCRUMB_ENTRY}
      wordCount={0}
      barRef={barRef}
      loadingTitle
      rawMode={false}
      forceRawMode={false}
      showTableOfContents={actions.showTableOfContents}
      onToggleTableOfContents={actions.onToggleTableOfContents}
      noteWidth={actions.noteWidth}
      onToggleNoteWidth={actions.onToggleNoteWidth}
      locale={locale}
    />
  )
}

function buildBreadcrumbActions(model: EditorContentModel): BreadcrumbActions {
  return {
    effectiveRawMode: model.effectiveRawMode,
    onToggleRaw: model.onToggleRaw,
    forceRawMode: model.forceRawMode,
    showTableOfContents: model.showTableOfContents,
    onToggleTableOfContents: model.onToggleTableOfContents,
    onRevealFile: model.onRevealFile,
    onCopyFilePath: model.onCopyFilePath,
    onExportPdf: model.onExportPdf,
    onDeleteNote: model.onDeleteNote,
    onRenameFilename: model.onRenameFilename,
    noteWidth: model.noteWidth,
    onToggleNoteWidth: model.onToggleNoteWidth,
    availableTags: model.availableTags,
    onUpdateTags: model.onUpdateTags,
  }
}

function EditorBreadcrumbArea({
  actions,
  barRef,
  chromePath,
  chromeTab,
  chromeWordCount,
  isVaultLoading,
  locale,
}: {
  actions: BreadcrumbActions
  barRef: React.RefObject<HTMLDivElement | null>
  chromePath: string
  chromeTab: EditorContentModel['activeTab'] | EditorContentModel['loadingTab']
  chromeWordCount: number
  isVaultLoading?: boolean
  locale?: AppLocale
}) {
  if (chromeTab) {
    return (
      <ActiveTabBreadcrumb
        activeTab={chromeTab}
        barRef={barRef}
        wordCount={chromeWordCount}
        path={chromePath}
        locale={locale}
        loadingTitle={isVaultLoading}
        actions={actions}
      />
    )
  }

  if (!isVaultLoading) return null

  return <EditorLoadingBreadcrumb actions={actions} barRef={barRef} locale={locale} />
}

type EditorCanvasProps = Pick<
  EditorContentModel,
  | 'showEditor'
  | 'isHtmlFile'
  | 'legacyUnsupportedKind'
  | 'richEditorContentReady'
  | 'cssVars'
  | 'editor'
  | 'activeTab'
  | 'entries'
  | 'onNavigateWikilink'
  | 'onEditorChange'
  | 'isDeletedPreview'
  | 'vaultPath'
  | 'locale'
  | 'onImageImportError'
  | 'onOpenExternalFile'
  | 'onRevealFile'
  | 'onCopyFilePath'
>

function EditorCanvas(props: EditorCanvasProps) {
  if (!props.showEditor) return null
  if ((props.isHtmlFile || props.legacyUnsupportedKind) && props.activeTab) {
    return (
      <FilePreview
        entry={props.activeTab.entry}
        locale={props.locale}
        onCopyFilePath={props.onCopyFilePath}
        onOpenExternalFile={props.onOpenExternalFile}
        onRevealFile={props.onRevealFile}
      />
    )
  }
  return <StandardEditorCanvas {...props} />
}

function StandardEditorCanvas(options: EditorCanvasProps) {
  const {
    richEditorContentReady,
    cssVars,
    editor,
    activeTab,
    entries,
    onNavigateWikilink,
    onEditorChange,
    isDeletedPreview,
    vaultPath,
    locale,
    onImageImportError,
  } = options
  if (!richEditorContentReady) return null

  return (
    <EditorFindScope className="editor-scroll-area" style={cssVars as React.CSSProperties}>
      <div className="editor-content-wrapper" data-note-pdf-export-root="true">
        <SingleEditorView
          editor={editor}
          entries={entries}
          onNavigateWikilink={onNavigateWikilink}
          onChange={onEditorChange}
          onImageImportError={onImageImportError}
          sourceEntry={activeTab?.entry ?? null}
          vaultPath={vaultPath}
          editable={!isDeletedPreview}
          locale={locale}
        />
      </div>
    </EditorFindScope>
  )
}

function EditorFindScope({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null)
  useEditorFocusScope(scopeRef)
  const syncAvailability = useCallback(() => {
    const activeElement = document.activeElement
    const enabled = activeElement instanceof Node && scopeRef.current?.contains(activeElement) === true
    dispatchEditorFindAvailability(enabled)
  }, [])

  useEffect(() => () => dispatchEditorFindAvailability(false), [])

  return (
    <div
      ref={scopeRef}
      className={className}
      data-editor-find-scope="true"
      onFocusCapture={() => dispatchEditorFindAvailability(true)}
      onBlurCapture={() => requestAnimationFrame(syncAvailability)}
      style={style}
    >
      {children}
    </div>
  )
}

export function EditorContentLayout(model: EditorContentModel) {
  const {
    activeTab,
    loadingTab,
    entries,
    editor,
    effectiveRawMode,
    onRawContentChange,
    onSave,
    showEditor,
    path,
    breadcrumbBarRef,
    wordCount,
    vaultPath,
    cssVars,
    onNavigateWikilink,
    onEditorChange,
    isDeletedPreview,
    rawLatestContentRef,
    rawModeContent,
    noteWidth,
    isHtmlFile,
    legacyUnsupportedKind,
    richEditorContentReady,
    findRequest,
    locale,
    onImageImportError,
    isVaultLoading,
  } = model
  const rootClassName = cn(
    'flex flex-1 flex-col min-w-0 min-h-0',
    isHtmlFile || legacyUnsupportedKind || noteWidth === 'wide' ? 'editor-content-width--wide' : 'editor-content-width--normal',
  )
  const chromeTab = activeTab ?? loadingTab
  const chromePath = chromeTab?.entry.path ?? path
  const chromeWordCount = activeTab ? wordCount : 0
  const showActiveContent = activeTab && !isVaultLoading
  const breadcrumbActions = buildBreadcrumbActions(model)

  return (
    <div className={rootClassName}>
      <EditorBreadcrumbArea
        actions={breadcrumbActions}
        barRef={breadcrumbBarRef}
        chromePath={chromePath}
        chromeTab={chromeTab}
        chromeWordCount={chromeWordCount}
        isVaultLoading={isVaultLoading}
        locale={locale}
      />
      {showActiveContent && (
        <>
          <RawModeEditorSection
            activeTab={activeTab}
            entries={entries}
            findRequest={findRequest}
            rawMode={effectiveRawMode}
            rawModeContent={rawModeContent}
            onRawContentChange={onRawContentChange}
            onImageImportError={onImageImportError}
            onSave={onSave}
            rawLatestContentRef={rawLatestContentRef}
            vaultPath={vaultPath}
            locale={locale}
          />
          <EditorCanvas
            showEditor={showEditor}
            isHtmlFile={isHtmlFile}
            legacyUnsupportedKind={legacyUnsupportedKind}
            richEditorContentReady={richEditorContentReady}
            cssVars={cssVars}
            activeTab={activeTab}
            vaultPath={vaultPath}
            editor={editor}
            entries={entries}
            onNavigateWikilink={onNavigateWikilink}
            onEditorChange={onEditorChange}
            onImageImportError={onImageImportError}
            isDeletedPreview={isDeletedPreview}
            locale={locale}
            onOpenExternalFile={model.onOpenExternalFile}
            onRevealFile={model.onRevealFile}
            onCopyFilePath={model.onCopyFilePath}
          />
        </>
      )}
    </div>
  )
}
