import { Tag } from '@phosphor-icons/react'
import { useMemo } from 'react'
import type { VaultEntry } from '../types'
import { translate, type AppLocale } from '../lib/i18n'
import { buildTagCounts } from '../utils/noteTags'
import { NavItem } from './SidebarParts'
import { SidebarGroupHeader } from './sidebar/SidebarGroupHeader'

interface SidebarTagsSectionProps {
  entries: VaultEntry[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  collapsed: boolean
  onToggle: () => void
  locale: AppLocale
}

export function SidebarTagsSection({
  entries,
  selectedTags,
  onToggleTag,
  collapsed,
  onToggle,
  locale,
}: SidebarTagsSectionProps) {
  const tagCounts = useMemo(() => buildTagCounts(entries), [entries])
  if (tagCounts.length === 0) return null

  return (
    <section data-testid="sidebar-tags" className="border-b border-border px-1.5">
      <SidebarGroupHeader
        label={translate(locale, 'sidebar.group.tags')}
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="space-y-0.5 pb-2">
          {tagCounts.map((tag) => (
            <div key={tag.name} data-testid="sidebar-tag">
              <NavItem
                icon={Tag}
                label={tag.name}
                count={tag.count}
                isActive={selectedTags.includes(tag.name)}
                ariaPressed={selectedTags.includes(tag.name)}
                onClick={() => onToggleTag(tag.name)}
                activeClassName="bg-primary/10 text-primary"
                activeBadgeClassName="bg-primary/15 text-primary"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
