import type { createTranslator } from '../lib/i18n'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

export function SettingsFooter({
  disabled = false,
  error,
  onClose,
  onSave,
  t,
}: {
  disabled?: boolean
  error?: string | null
  onClose: () => void
  onSave: () => void | Promise<void>
  t: Translate
}) {
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ height: 56, padding: '0 24px', borderTop: '1px solid var(--border)' }}
    >
      <div className="min-w-0 flex-1 pr-3">
        {error ? <p role="alert" className="text-xs leading-4 text-destructive">{error}</p> : <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{t('settings.footerShortcut')}</span>}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onClose}>
          {t('settings.cancel')}
        </Button>
        <Button size="sm" disabled={disabled} onClick={onSave} data-testid="settings-save">
          {t('settings.save')}
        </Button>
      </div>
    </div>
  )
}
