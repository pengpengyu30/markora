import type { useCreateBlockNote } from '@blocknote/react'
import type { AppLocale } from '../lib/i18n'
import type { VaultEntry } from '../types'
import { BacklinksPanel } from './BacklinksPanel'
import { TableOfContentsPanel } from './TableOfContentsPanel'
import { useBacklinks } from '../hooks/useBacklinks'

interface EditorRightPanelProps {
  showTableOfContents?: boolean
  showBacklinks?: boolean
  rightPanelCollapsed: boolean
  rightPanelWidth: number
  editor: ReturnType<typeof useCreateBlockNote>
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  onToggleTableOfContents?: () => void
  onNavigateWikilink: (target: string) => void
  onToggleBacklinks?: () => void
  locale?: AppLocale
}

export function EditorRightPanel(options: EditorRightPanelProps) {
  if (options.rightPanelCollapsed) return null

  if (options.showTableOfContents) {
    return renderTableOfContents(options)
  }

  if (options.showBacklinks) {
    return <BacklinksRightPanel {...options} />
  }

  return null
}

function BacklinksRightPanel({ entry, entries, rightPanelWidth, onNavigateWikilink }: EditorRightPanelProps) {
  const backlinks = useBacklinks(entry, entries)

  return (
    <div className="shrink-0 flex flex-col min-h-0 overflow-y-auto border-l border-border bg-background p-3" style={{ width: rightPanelWidth, height: '100%' }}>
      <BacklinksPanel backlinks={backlinks} onNavigate={onNavigateWikilink} />
    </div>
  )
}

function renderTableOfContents(options: EditorRightPanelProps) {
  const { editor, content, entry, rightPanelWidth, locale, onToggleTableOfContents } = options

  return (
    <div className="shrink-0 flex flex-col min-h-0" style={{ width: rightPanelWidth, minWidth: 240, height: '100%' }}>
      <TableOfContentsPanel
        editor={editor}
        entry={entry}
        locale={locale}
        onClose={() => onToggleTableOfContents?.()}
        sourceContent={content}
      />
    </div>
  )
}
