import { Folder } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { translate, type AppLocale } from '../../lib/i18n'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import { SIDEBAR_ITEM_PADDING } from './sidebarStyles'

interface SidebarLoadingSectionsProps {
  collapsed: boolean
  locale?: AppLocale
  onToggle: () => void
}

interface SidebarLoadingRowProps {
  id: string
  icon?: ReactNode
  iconColor?: string
  labelWidth: number
}

const FOLDER_ROWS: SidebarLoadingRowProps[] = [
  { id: 'folder-primary', icon: <Folder size={16} />, labelWidth: 118 },
  { id: 'folder-secondary', icon: <Folder size={16} />, labelWidth: 92 },
]

function SidebarLoadingIcon({ icon, iconColor }: Pick<SidebarLoadingRowProps, 'icon' | 'iconColor'>) {
  if (icon) return <span className="shrink-0 text-muted-foreground">{icon}</span>

  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-sm"
      style={{ background: iconColor ?? 'var(--muted)' }}
    />
  )
}

function SidebarLoadingBar({ width }: { width: number }) {
  return <span aria-hidden="true" className="h-3.5 rounded bg-muted" style={{ width }} />
}

function SidebarLoadingRow({ icon, iconColor, labelWidth }: Omit<SidebarLoadingRowProps, 'id'>) {
  return (
    <div
      className="flex select-none items-center gap-2 rounded"
      style={{ padding: SIDEBAR_ITEM_PADDING.withCount, borderRadius: 4 }}
    >
      <SidebarLoadingIcon icon={icon} iconColor={iconColor} />
      <div className="flex min-w-0 flex-1 items-center">
        <SidebarLoadingBar width={labelWidth} />
      </div>
    </div>
  )
}

function SidebarLoadingSection({ collapsed, locale, onToggle }: SidebarLoadingSectionsProps) {
  return (
    <div className="border-b border-border" data-testid="sidebar-loading-folders" style={{ padding: '0 6px' }}>
      <SidebarGroupHeader
        label={translate(locale ?? 'en', 'sidebar.group.folders')}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="flex flex-col gap-0.5 pb-2 animate-pulse" aria-hidden="true">
          {FOLDER_ROWS.map(({ id, ...row }) => (
            <SidebarLoadingRow key={`sidebar-loading-folders-${id}`} {...row} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SidebarFolderLoadingSection(props: SidebarLoadingSectionsProps) {
  return <SidebarLoadingSection {...props} />
}
