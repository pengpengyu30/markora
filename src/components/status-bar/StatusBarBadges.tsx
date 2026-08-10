import { CircleNotch as Loader2 } from '@phosphor-icons/react'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import { translate, type AppLocale } from '../../lib/i18n'
import { ICON_STYLE, SEP_STYLE } from './styles'

function StatusBarSeparator({ show = true }: { show?: boolean }) {
  if (!show) return null
  return <span style={SEP_STYLE}>|</span>
}

function StatusBarAction({
  children,
  copy,
  compact,
  testId,
}: {
  children: React.ReactNode
  copy: string
  compact: boolean
  testId: string
}) {
  return (
    <ActionTooltip copy={{ label: copy }} side="top">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={compact
          ? 'h-6 gap-0.5 rounded-sm px-0.5 text-[12px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
          : 'h-auto gap-1 rounded-sm px-1 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'}
        aria-label={copy}
        data-testid={testId}
      >
        {children}
      </Button>
    </ActionTooltip>
  )
}

export function OfflineBadge({
  isOffline,
  showSeparator = true,
  compact = false,
  locale = 'en',
}: {
  isOffline?: boolean
  showSeparator?: boolean
  compact?: boolean
  locale?: AppLocale
}) {
  if (!isOffline) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <span
        style={{
          ...ICON_STYLE,
          color: 'var(--destructive)',
          background: 'var(--feedback-error-bg)',
          borderRadius: 999,
          padding: '2px 6px',
          fontWeight: 600,
        }}
        title={translate(locale, 'status.offline.title')}
        data-testid="status-offline"
      >
        <span aria-hidden="true" style={{ fontSize: 10, lineHeight: 1 }}>
          ●
        </span>
        {compact ? null : translate(locale, 'status.offline.label')}
      </span>
    </>
  )
}

export function VaultReloadingBadge({
  isReloading,
  showSeparator = true,
  compact = false,
  locale = 'en',
}: {
  isReloading?: boolean
  showSeparator?: boolean
  compact?: boolean
  locale?: AppLocale
}) {
  if (!isReloading) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={translate(locale, 'status.vault.reloadingTooltip')}
        testId="status-vault-reloading"
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Loader2 size={13} className="animate-spin" />
          {compact ? null : translate(locale, 'status.vault.reloading')}
        </span>
      </StatusBarAction>
    </>
  )
}
