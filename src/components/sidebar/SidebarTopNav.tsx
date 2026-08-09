import { FileText } from '@phosphor-icons/react'
import type { SidebarSelection } from '../../types'
import { NavItem } from '../SidebarParts'
import { translate, type AppLocale } from '../../lib/i18n'

function isSelectionActive(current: SidebarSelection, check: SidebarSelection): boolean {
  if (current.kind !== check.kind) return false
  switch (check.kind) {
    case 'filter':
      return current.kind === 'filter' && current.filter === check.filter
    case 'folder':
      return current.kind === 'folder' && current.path === check.path
    default:
      return false
  }
}

interface SidebarTopNavProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  activeCount: number
  locale?: AppLocale
  loading?: boolean
}

export function SidebarTopNav(options: SidebarTopNavProps) {
  const { selection, onSelect, activeCount, locale = 'en', loading = false } = options
  return (
    <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: '4px 6px' }}>
      <NavItem
        icon={FileText}
        label={translate(locale, 'sidebar.nav.allNotes')}
        count={activeCount}
        countLoading={loading}
        isActive={isSelectionActive(selection, {
          kind: 'filter',
          filter: 'all',
        })}
        badgeClassName="text-muted-foreground"
        badgeStyle={{ background: 'var(--muted)' }}
        activeBadgeClassName="bg-primary text-primary-foreground"
        onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
      />
    </div>
  )
}
