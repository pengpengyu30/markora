import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'
import type { IconProps } from '@phosphor-icons/react'
import { SIDEBAR_ITEM_PADDING } from './sidebar/sidebarStyles'
import { Button } from './ui/button'

const SIDEBAR_COUNT_PILL_STYLE = {
  borderRadius: 9999,
  padding: '0 6px',
  fontSize: 10,
  fontVariantNumeric: 'tabular-nums',
} as const

function hasSidebarCount(count?: number): count is number {
  return count !== undefined && count > 0
}

function getNavItemPadding(compact: boolean | undefined, hasCount: boolean) {
  if (compact) return hasCount ? SIDEBAR_ITEM_PADDING.compactWithCount : SIDEBAR_ITEM_PADDING.compact
  return hasCount ? SIDEBAR_ITEM_PADDING.withCount : SIDEBAR_ITEM_PADDING.regular
}

function getNavItemIconSize(compact?: boolean) {
  return compact ? 14 : 16
}

function getNavItemTextClass(compact?: boolean) {
  return compact ? 'text-[12px]' : 'text-[13px]'
}

function resolveBadgeClassName(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  badgeClassName: string | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeClassName
  return badgeClassName
}

function resolveBadgeStyle(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  activeBadgeStyle: React.CSSProperties | undefined,
  badgeStyle: React.CSSProperties | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeStyle
  return badgeStyle
}

function SidebarNavIcon({
  Icon,
  emoji,
  iconSize,
  isActive,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  iconSize: number
  isActive?: boolean
}) {
  if (emoji) {
    return (
      <span
        style={{
          fontSize: iconSize,
          lineHeight: 1,
          width: iconSize,
          textAlign: 'center',
        }}
      >
        {emoji}
      </span>
    )
  }
  return <Icon size={iconSize} weight={isActive ? 'fill' : 'regular'} />
}

export function SidebarCountPill({
  count,
  className,
  style,
  compact,
  testId = 'sidebar-count-chip',
}: {
  count: number
  className?: string
  style?: React.CSSProperties
  compact?: boolean
  testId?: string
}) {
  return (
    <span
      data-testid={testId}
      className={cn('flex items-center justify-center', className)}
      style={{
        height: compact ? 18 : 20,
        ...SIDEBAR_COUNT_PILL_STYLE,
        ...style,
      }}
    >
      {count}
    </span>
  )
}

export function SidebarLoadingCountPill({
  compact,
  testId = 'sidebar-count-skeleton',
}: {
  compact?: boolean
  testId?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="inline-flex animate-pulse rounded-full bg-muted"
      style={{ width: compact ? 22 : 28, height: compact ? 18 : 20 }}
    />
  )
}

function NavItemLabel({ label, compact }: { label: string; compact?: boolean }) {
  return <span className={cn('min-w-0 flex-1 truncate text-left font-medium', getNavItemTextClass(compact))}>{label}</span>
}

function NavItemCount({
  count,
  countLoading,
  className,
  style,
  compact,
}: {
  count?: number
  countLoading?: boolean
  className?: string
  style?: React.CSSProperties
  compact?: boolean
}) {
  if (countLoading) return <SidebarLoadingCountPill compact={compact} />
  if (!hasSidebarCount(count)) return null
  return <SidebarCountPill count={count} className={className} style={style} compact={compact} />
}

function DisabledNavItem({
  Icon,
  emoji,
  label,
  compact,
  disabledTooltip,
  padding,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  compact?: boolean
  disabledTooltip?: string
  padding: ReturnType<typeof getNavItemPadding>
}) {
  return (
    <div
      className="flex select-none items-center gap-2 rounded text-foreground"
      style={{ padding, borderRadius: 4, opacity: 0.4, cursor: 'not-allowed' }}
      title={disabledTooltip ?? 'Coming soon'}
    >
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} />
      <NavItemLabel label={label} compact={compact} />
    </div>
  )
}

function ClickableNavItem(options: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  countLoading?: boolean
  isActive?: boolean
  activeClassName: string
  badgeClassName?: string
  badgeStyle?: React.CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: React.CSSProperties
  onClick?: () => void
  compact?: boolean
  padding: ReturnType<typeof getNavItemPadding>
}) {
  const {
    Icon,
    emoji,
    label,
    count,
    countLoading,
    isActive,
    activeClassName,
    badgeClassName,
    badgeStyle,
    activeBadgeClassName,
    activeBadgeStyle,
    onClick,
    compact,
    padding,
  } = options
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-auto w-full cursor-pointer select-none justify-start rounded text-left transition-colors',
        isActive ? activeClassName : 'text-foreground hover:bg-accent',
      )}
      style={{ padding, borderRadius: 4 }}
      onClick={onClick}
    >
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} isActive={isActive} />
      <NavItemLabel label={label} compact={compact} />
      <NavItemCount
        count={count}
        countLoading={countLoading}
        className={resolveBadgeClassName(isActive, activeBadgeClassName, badgeClassName)}
        style={resolveBadgeStyle(isActive, activeBadgeClassName, activeBadgeStyle, badgeStyle)}
        compact={compact}
      />
    </Button>
  )
}

export function NavItem(options: {
  icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  countLoading?: boolean
  isActive?: boolean
  activeClassName?: string
  badgeClassName?: string
  badgeStyle?: React.CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: React.CSSProperties
  onClick?: () => void
  disabled?: boolean
  disabledTooltip?: string
  compact?: boolean
}) {
  const {
    icon: Icon,
    emoji,
    label,
    count,
    countLoading,
    isActive,
    activeClassName = 'bg-primary/10 text-primary',
    badgeClassName,
    badgeStyle,
    activeBadgeClassName,
    activeBadgeStyle,
    onClick,
    disabled,
    disabledTooltip,
    compact,
  } = options
  const padding = getNavItemPadding(compact, countLoading || hasSidebarCount(count))
  if (disabled) {
    return (
      <DisabledNavItem
        Icon={Icon}
        emoji={emoji}
        label={label}
        compact={compact}
        disabledTooltip={disabledTooltip}
        padding={padding}
      />
    )
  }

  return (
    <ClickableNavItem
      Icon={Icon}
      emoji={emoji}
      label={label}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
      activeClassName={activeClassName}
      badgeClassName={badgeClassName}
      badgeStyle={badgeStyle}
      activeBadgeClassName={activeBadgeClassName}
      activeBadgeStyle={activeBadgeStyle}
      onClick={onClick}
      compact={compact}
      padding={padding}
    />
  )
}
