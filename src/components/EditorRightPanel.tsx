import type { useCreateBlockNote } from '@blocknote/react'
import type { AppLocale } from '../lib/i18n'
import type { GitCommit, VaultEntry, WorkspaceIdentity } from '../types'
import type { FrontmatterOpOptions } from '../hooks/frontmatterOps'
import type { FrontmatterValue } from './Inspector'
import { Inspector } from './Inspector'
import { TableOfContentsPanel } from './TableOfContentsPanel'

interface EditorRightPanelProps {
  showTableOfContents?: boolean
  inspectorCollapsed: boolean
  inspectorWidth: number
  editor: ReturnType<typeof useCreateBlockNote>
  inspectorEntry: VaultEntry | null
  inspectorContent: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  vaultPath: string
  onToggleInspector: () => void
  onToggleTableOfContents?: () => void
  onNavigateWikilink: (target: string) => void
  onViewCommitDiff: (commitHash: string) => Promise<void>
  onUpdateFrontmatter?: (
    path: string,
    key: string,
    value: FrontmatterValue,
    options?: FrontmatterOpOptions,
  ) => Promise<void>
  onDeleteProperty?: (path: string, key: string, options?: FrontmatterOpOptions) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue, options?: FrontmatterOpOptions) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | undefined>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onChangeWorkspace?: (entry: VaultEntry, workspace: WorkspaceIdentity) => Promise<void> | void
  onInitializeProperties?: (path: string) => void
  onToggleRawEditor?: () => void
  workspaces?: WorkspaceIdentity[]
  locale?: AppLocale
}

export function EditorRightPanel(options: EditorRightPanelProps) {
  if (!options.inspectorCollapsed) {
    return renderExpandedInspector(options)
  }

  if (options.showTableOfContents) {
    return renderTableOfContents(options)
  }

  return null
}

function renderExpandedInspector(options: EditorRightPanelProps) {
  const {
    inspectorCollapsed,
    inspectorWidth,
    inspectorEntry,
    inspectorContent,
    entries,
    gitHistory,
    vaultPath,
    onToggleInspector,
    onNavigateWikilink,
    onViewCommitDiff,
    onUpdateFrontmatter,
    onDeleteProperty,
    onAddProperty,
    onCreateMissingType,
    onCreateAndOpenNote,
    onChangeWorkspace,
    onInitializeProperties,
    onToggleRawEditor,
    workspaces,
    locale,
  } = options

  return (
    <div className="shrink-0 flex flex-col min-h-0" style={{ width: inspectorWidth, height: '100%' }}>
      <Inspector
        collapsed={inspectorCollapsed}
        onToggle={onToggleInspector}
        entry={inspectorEntry}
        content={inspectorContent}
        entries={entries}
        gitHistory={gitHistory}
        vaultPath={vaultPath}
        onNavigate={onNavigateWikilink}
        onViewCommitDiff={onViewCommitDiff}
        onUpdateFrontmatter={onUpdateFrontmatter}
        onDeleteProperty={onDeleteProperty}
        onAddProperty={onAddProperty}
        onCreateMissingType={onCreateMissingType}
        onCreateAndOpenNote={onCreateAndOpenNote}
        onChangeWorkspace={onChangeWorkspace}
        onInitializeProperties={onInitializeProperties}
        onToggleRawEditor={onToggleRawEditor}
        workspaces={workspaces}
        locale={locale}
      />
    </div>
  )
}

function renderTableOfContents(options: EditorRightPanelProps) {
  const { editor, inspectorContent, inspectorEntry, inspectorWidth, locale, onToggleTableOfContents } = options

  return (
    <div className="shrink-0 flex flex-col min-h-0" style={{ width: inspectorWidth, minWidth: 240, height: '100%' }}>
      <TableOfContentsPanel
        editor={editor}
        entry={inspectorEntry}
        locale={locale}
        onClose={() => onToggleTableOfContents?.()}
        sourceContent={inspectorContent}
      />
    </div>
  )
}
