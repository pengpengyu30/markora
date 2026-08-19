import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, SidebarSimple } from '@phosphor-icons/react'
import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../../hooks/appCommandCatalog'
import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { useDragRegion } from '../../hooks/useDragRegion'
import { translate, type AppLocale } from '../../lib/i18n'
import { MACOS_TRAFFIC_LIGHT_SAFE_PADDING } from '../../utils/platform'

export { SidebarTopNav } from './SidebarTopNav'

const SIDEBAR_TITLE_BAR_ACTION_CLASSNAME =
  '!h-auto !w-auto !min-w-0 !rounded-none !p-0 text-muted-foreground hover:!bg-transparent hover:text-foreground [&_svg]:!size-4'
const SIDEBAR_TITLE_BAR_LEFT_PADDING = `var(--markora-macos-traffic-light-padding, ${MACOS_TRAFFIC_LIGHT_SAFE_PADDING}px)`

const SIDEBAR_COLLAPSE_SHORTCUT = getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewEditorList)
const HISTORY_BACK_SHORTCUT = getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoBack)
const HISTORY_FORWARD_SHORTCUT = getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewGoForward)

function titleWithShortcut(label: string, shortcut?: string): string {
  return shortcut ? `${label} (${shortcut})` : label
}

function SidebarTitleBarAction({
  children,
  disabled = false,
  label,
  onClick,
  shortcut,
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  onClick?: () => void
  shortcut?: string
}) {
  const title = titleWithShortcut(label, shortcut)

  return (
    <ActionTooltip copy={{ label, shortcut }} side="bottom" sideOffset={8}>
      <span className="inline-flex" title={title} data-no-drag>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={SIDEBAR_TITLE_BAR_ACTION_CLASSNAME}
          onClick={(event) => {
            event.stopPropagation()
            onClick?.()
          }}
          disabled={disabled}
          aria-label={label}
          title={title}
          data-no-drag
        >
          {children}
        </Button>
      </span>
    </ActionTooltip>
  )
}

export function SidebarTitleBar({
  locale = 'en',
  onCollapse,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
}: {
  locale?: AppLocale
  onCollapse?: () => void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
}) {
  const { dragRegionRef } = useDragRegion<HTMLDivElement>()
  const collapseLabel = translate(locale, 'sidebar.action.collapse')
  const backLabel = translate(locale, 'command.navigation.goBack')
  const forwardLabel = translate(locale, 'command.navigation.goForward')

  return (
    <div
      ref={dragRegionRef}
      className="shrink-0 flex items-center border-b border-border"
      style={{
        height: 52,
        padding: '0 8px',
        paddingLeft: SIDEBAR_TITLE_BAR_LEFT_PADDING,
        cursor: 'default',
        justifyContent: 'flex-start',
      }}
    >
      <div className="flex items-center gap-5" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
        {onCollapse && (
          <SidebarTitleBarAction label={collapseLabel} shortcut={SIDEBAR_COLLAPSE_SHORTCUT} onClick={onCollapse}>
            <SidebarSimple size={16} weight="regular" />
          </SidebarTitleBarAction>
        )}
        {onGoBack && (
          <SidebarTitleBarAction
            label={backLabel}
            shortcut={HISTORY_BACK_SHORTCUT}
            onClick={onGoBack}
            disabled={!canGoBack}
          >
            <ArrowLeft size={16} weight="regular" />
          </SidebarTitleBarAction>
        )}
        {onGoForward && (
          <SidebarTitleBarAction
            label={forwardLabel}
            shortcut={HISTORY_FORWARD_SHORTCUT}
            onClick={onGoForward}
            disabled={!canGoForward}
          >
            <ArrowRight size={16} weight="regular" />
          </SidebarTitleBarAction>
        )}
      </div>
    </div>
  )
}
