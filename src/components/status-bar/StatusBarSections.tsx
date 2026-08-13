import { BookOpen, GearSix as Settings, Moon, Sun, type IconProps } from '@phosphor-icons/react'
import type { ComponentType, MouseEventHandler } from 'react'
import type { ThemeMode } from '../../lib/themeMode'
import { translate, type AppLocale, type TranslationKey } from '../../lib/i18n'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import { OfflineBadge, VaultReloadingBadge } from './StatusBarBadges'
import { ICON_STYLE } from './styles'
import type { VaultOption } from './types'
import { VaultMenu } from './VaultMenu'
import { formatShortcutDisplay } from '../../hooks/appCommandCatalog'

const SETTINGS_SHORTCUT = { shortcut: formatShortcutDisplay({ display: '⌘,' }) } as const
const ZOOM_RESET_SHORTCUT = { shortcut: formatShortcutDisplay({ display: '⌘0' }) } as const

interface StatusBarPrimarySectionProps {
  vaultPath: string
  defaultWorkspacePath?: string | null
  vaults: VaultOption[]
  multiWorkspaceEnabled?: boolean
  onSwitchVault: (path: string) => void
  onSetDefaultWorkspace?: (path: string) => void
  onOpenVaultSettings?: () => void
  onOpenLocalFolder?: () => void
  onCreateEmptyVault?: () => void
  onCloneGettingStarted?: () => void
  isOffline?: boolean
  isVaultReloading?: boolean
  onRemoveVault?: (path: string) => void
  onReorderVaults?: (orderedPaths: string[]) => void
  onUpdateWorkspaceIdentity?: (path: string, patch: Partial<VaultOption>) => void
  stacked?: boolean
  compact?: boolean
  locale?: AppLocale
}

interface StatusBarSecondarySectionProps {
  noteCount: number
  zoomLevel: number
  themeMode?: ThemeMode
  onZoomReset?: () => void
  onToggleThemeMode?: () => void
  onOpenDocs?: () => void
  onOpenSettings?: () => void
  stacked?: boolean
  compact?: boolean
  locale?: AppLocale
}

type StatusLinkButtonProps = {
  compact: boolean
  icon: ComponentType<IconProps>
  labelKey: TranslationKey
  locale: AppLocale
  onClick: MouseEventHandler<HTMLButtonElement>
  testId: string
  tooltipKey: TranslationKey
}

function StatusLinkButton({ compact, icon: Icon, labelKey, locale, onClick, testId, tooltipKey }: StatusLinkButtonProps) {
  const className = compact
    ? 'h-6 w-6 rounded-sm p-0 text-muted-foreground hover:text-foreground'
    : 'h-6 px-2 text-[12px] font-medium text-muted-foreground hover:text-foreground'

  return (
    <ActionTooltip copy={{ label: translate(locale, tooltipKey) }} side="top">
      <Button type="button" variant="ghost" size="xs" className={className} onClick={onClick} aria-label={translate(locale, tooltipKey)} data-testid={testId}>
        <Icon size={14} weight="regular" />
        {compact ? null : translate(locale, labelKey)}
      </Button>
    </ActionTooltip>
  )
}

function DocsButton({ compact, locale, onOpenDocs }: { compact: boolean; locale: AppLocale; onOpenDocs: () => void }) {
  return (
    <StatusLinkButton
      compact={compact}
      icon={BookOpen}
      labelKey="status.docs.label"
      locale={locale}
      onClick={onOpenDocs}
      testId="status-docs"
      tooltipKey="status.docs.open"
    />
  )
}

function primarySectionStyle(stacked: boolean, compact: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? 8 : 12,
    rowGap: stacked ? 4 : 0,
    flex: 1,
    minWidth: 0,
    width: stacked ? '100%' : 'auto',
    flexBasis: stacked ? '100%' : 'auto',
    flexWrap: stacked ? 'wrap' : 'nowrap',
  } as const
}

export function StatusBarPrimarySection(options: StatusBarPrimarySectionProps) {
  const {
    vaultPath,
    defaultWorkspacePath,
    vaults,
    multiWorkspaceEnabled,
    onSwitchVault,
    onSetDefaultWorkspace,
    onOpenVaultSettings,
    onOpenLocalFolder,
    onCreateEmptyVault,
    onCloneGettingStarted,
    isOffline = false,
    isVaultReloading = false,
    onRemoveVault,
    onReorderVaults,
    onUpdateWorkspaceIdentity,
    locale = 'en',
    stacked = false,
    compact = false,
  } = options

  return (
    <div style={primarySectionStyle(stacked, compact)}>
      <VaultMenu
        vaults={vaults}
        vaultPath={vaultPath}
        defaultWorkspacePath={defaultWorkspacePath}
        multiWorkspaceEnabled={multiWorkspaceEnabled}
        onSwitchVault={onSwitchVault}
        onSetDefaultWorkspace={onSetDefaultWorkspace}
        onOpenVaultSettings={onOpenVaultSettings}
        onOpenLocalFolder={onOpenLocalFolder}
        onCreateEmptyVault={onCreateEmptyVault}
        onCloneGettingStarted={onCloneGettingStarted}
        onRemoveVault={onRemoveVault}
        onReorderVaults={onReorderVaults}
        onUpdateWorkspaceIdentity={onUpdateWorkspaceIdentity}
        compact={compact}
        locale={locale}
      />
      <OfflineBadge isOffline={isOffline} showSeparator={!compact} compact={compact} locale={locale} />
      <VaultReloadingBadge isReloading={isVaultReloading} showSeparator={!compact} compact={compact} locale={locale} />
    </div>
  )
}

export function StatusBarSecondarySection(options: StatusBarSecondarySectionProps) {
  const { noteCount, zoomLevel, themeMode = 'light', onZoomReset, onToggleThemeMode, onOpenDocs, onOpenSettings, locale = 'en', stacked = false, compact = false } = options
  void noteCount
  const ThemeIcon = themeMode === 'dark' ? Sun : Moon
  const themeTooltip = { label: translate(locale, themeMode === 'dark' ? 'status.theme.light' : 'status.theme.dark') }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: stacked ? 'flex-end' : 'flex-start', gap: compact ? 8 : 12, flexShrink: 0, width: stacked ? '100%' : 'auto' }}>
      {zoomLevel === 100 ? null : (
        <ActionTooltip copy={{ label: translate(locale, 'status.zoom.reset'), ...ZOOM_RESET_SHORTCUT }} side="top">
          <Button type="button" variant="ghost" size="xs" className="h-auto rounded-sm px-1 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground" onClick={onZoomReset} aria-label={translate(locale, 'status.zoom.reset')} data-testid="status-zoom">
            <span style={ICON_STYLE}>{zoomLevel}%</span>
          </Button>
        </ActionTooltip>
      )}
      {onOpenDocs && <DocsButton compact={compact} locale={locale} onOpenDocs={onOpenDocs} />}
      <ActionTooltip copy={themeTooltip} side="top" align="end" contentTestId="status-theme-mode-tooltip">
        <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground" onClick={onToggleThemeMode} disabled={!onToggleThemeMode} aria-label={themeTooltip.label} data-testid="status-theme-mode">
          <ThemeIcon size={14} weight="regular" />
        </Button>
      </ActionTooltip>
      <ActionTooltip copy={{ label: translate(locale, 'status.settings.open'), ...SETTINGS_SHORTCUT }} side="top" align="end">
        <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground" onClick={onOpenSettings} aria-label={translate(locale, 'status.settings.open')} data-testid="status-settings">
          <Settings size={14} weight="regular" />
        </Button>
      </ActionTooltip>
    </div>
  )
}
