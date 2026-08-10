import { TooltipProvider } from './ui/tooltip'
import { SettingsGroup, SettingsSwitchRow } from './SettingsControls'
import { createTranslator, type AppLocale } from '../lib/i18n'
import type { VaultOption } from './status-bar/types'
import { ProjectSettingsRows } from './ProjectSettingsRows'

interface ProjectSettingsSectionProps {
  defaultProjectPath?: string | null
  enabled: boolean
  locale: AppLocale
  onEnabledChange: (enabled: boolean) => void
  onRemoveProject?: (path: string) => void
  onReorderProjects?: (orderedPaths: string[]) => void
  onSetDefaultProject?: (path: string) => void
  onUpdateProjectIdentity?: (path: string, patch: Partial<VaultOption>) => void
  projects: VaultOption[]
}

export function ProjectSettingsSection(options: ProjectSettingsSectionProps) {
  const {
    defaultProjectPath,
    enabled,
    locale,
    onEnabledChange,
    onRemoveProject,
    onReorderProjects,
    onSetDefaultProject,
    onUpdateProjectIdentity,
    projects,
  } = options
  const t = createTranslator(locale)

  return (
    <TooltipProvider>
      <SettingsGroup>
        <SettingsSwitchRow
          label={t('settings.projects.enable')}
          description={t('settings.projects.enableDescription')}
          checked={enabled}
          onChange={onEnabledChange}
          testId="settings-multi-workspace-enabled"
        />
        {enabled && (
          <ProjectSettingsRows
            defaultProjectPath={defaultProjectPath}
            locale={locale}
            onRemoveProject={onRemoveProject}
            onReorderProjects={onReorderProjects}
            onSetDefaultProject={onSetDefaultProject}
            onUpdateProjectIdentity={onUpdateProjectIdentity}
            projects={projects}
          />
        )}
      </SettingsGroup>
    </TooltipProvider>
  )
}
