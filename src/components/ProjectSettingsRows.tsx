import { Info, Trash as Trash2 } from '@phosphor-icons/react'
import { type KeyboardEvent, useState } from 'react'
import { AccentColorPicker } from './AccentColorPicker'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { SettingsGroupItem } from './SettingsControls'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { ProjectMoveButtons } from './ProjectMoveButtons'
import { createTranslator, type AppLocale } from '../lib/i18n'
import { trackEvent } from '../lib/telemetry'
import type { VaultOption } from './status-bar/types'
import { canMoveVaultPath, moveVaultPath, type VaultMoveDirection } from '../utils/vaultOrdering'
import { workspaceIdentityFromVault } from '../utils/workspaces'

interface ProjectSettingsRowsProps {
  defaultProjectPath?: string | null
  locale: AppLocale
  onRemoveProject?: (path: string) => void
  onReorderProjects?: (orderedPaths: string[]) => void
  onSetDefaultProject?: (path: string) => void
  onUpdateProjectIdentity?: (path: string, patch: Partial<VaultOption>) => void
  projects: VaultOption[]
}

function workspaceInputId(alias: string, field: 'name' | 'label' | 'slug'): string {
  return `settings-project-${alias}-${field}`
}

function sanitizeWorkspaceShortLabel(value: string): string {
  return value.trim().toUpperCase().slice(0, 3)
}

function ProjectFieldLabel({ htmlFor, label, tooltip }: { htmlFor: string; label: string; tooltip: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <label className="truncate text-[11px] font-medium text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="h-4 w-4 shrink-0 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={tooltip}
          >
            <Info size={12} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function ProjectIdentityInputs({
  canEdit,
  locale,
  onUpdateProjectIdentity,
  project,
}: Pick<ProjectSettingsRowsProps, 'locale' | 'onUpdateProjectIdentity'> & {
  canEdit: boolean
  project: VaultOption
}) {
  const t = createTranslator(locale)
  const workspace = workspaceIdentityFromVault(project)
  const nameId = workspaceInputId(workspace.alias, 'name')
  const labelId = workspaceInputId(workspace.alias, 'label')
  const slugId = workspaceInputId(workspace.alias, 'slug')
  const savedNameDraft = project.label ?? ''
  const savedShortLabelDraft = sanitizeWorkspaceShortLabel(project.shortLabel || workspace.shortLabel)
  const [nameDraft, setNameDraft] = useState(savedNameDraft)
  const [shortLabelDraft, setShortLabelDraft] = useState(savedShortLabelDraft)

  const commitNameDraft = () => {
    if (!canEdit || nameDraft === savedNameDraft) return
    onUpdateProjectIdentity?.(project.path, { label: nameDraft })
  }

  const commitShortLabelDraft = () => {
    const normalizedShortLabel = sanitizeWorkspaceShortLabel(shortLabelDraft)
    if (!canEdit || normalizedShortLabel === savedShortLabelDraft) return
    onUpdateProjectIdentity?.(project.path, {
      shortLabel: normalizedShortLabel,
    })
  }

  const blurOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur()
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(80px,0.28fr)_minmax(140px,0.55fr)]">
      <div className="grid gap-1.5">
        <ProjectFieldLabel
          htmlFor={nameId}
          label={t('settings.projects.name')}
          tooltip={t('settings.projects.nameTooltip')}
        />
        <Input
          id={nameId}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitNameDraft}
          onKeyDown={blurOnEnter}
          aria-label={t('settings.projects.nameAria', {
            label: workspace.label,
          })}
          disabled={!canEdit}
          className="h-8 bg-transparent"
        />
      </div>
      <div className="grid gap-1.5">
        <ProjectFieldLabel
          htmlFor={labelId}
          label={t('settings.projects.label')}
          tooltip={t('settings.projects.labelTooltip')}
        />
        <Input
          id={labelId}
          value={shortLabelDraft}
          maxLength={3}
          onChange={(event) => setShortLabelDraft(sanitizeWorkspaceShortLabel(event.target.value))}
          onBlur={commitShortLabelDraft}
          onKeyDown={blurOnEnter}
          aria-label={t('settings.projects.labelAria', {
            label: workspace.label,
          })}
          disabled={!canEdit}
          className="h-8 bg-transparent uppercase"
        />
      </div>
      <div className="grid gap-1.5">
        <ProjectFieldLabel
          htmlFor={slugId}
          label={t('settings.projects.slug')}
          tooltip={t('settings.projects.slugTooltip')}
        />
        <Input
          id={slugId}
          value={project.alias ?? workspace.alias}
          aria-label={t('settings.projects.slugAria', {
            label: workspace.label,
          })}
          readOnly
          aria-readonly="true"
          className="h-8 cursor-default bg-muted/30 text-muted-foreground"
        />
      </div>
    </div>
  )
}

function ProjectRowActions(
  options: Pick<ProjectSettingsRowsProps, 'locale' | 'onSetDefaultProject' | 'onUpdateProjectIdentity'> & {
    canEdit: boolean
    canMoveDown: boolean
    canMoveUp: boolean
    onMoveVault?: (path: string, direction: VaultMoveDirection) => void
    onRequestRemoveProject?: () => void
    workspace: ReturnType<typeof workspaceIdentityFromVault>
    project: VaultOption
  },
) {
  const {
    canEdit,
    canMoveDown,
    canMoveUp,
    locale,
    onMoveVault,
    onSetDefaultProject,
    onUpdateProjectIdentity,
    onRequestRemoveProject,
    workspace,
    project,
  } = options
  const t = createTranslator(locale)
  const removeLabel = t('settings.projects.removeAria', {
    label: workspace.label,
  })

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
      <ProjectMoveButtons
        canMoveDown={canMoveDown}
        canMoveUp={canMoveUp}
        locale={locale}
        onMoveVault={onMoveVault}
        project={project}
        workspace={workspace}
      />
      <AccentColorPicker
        className="gap-1.5"
        disabled={!canEdit}
        selectedColor={project.color ?? null}
        onSelectColor={(color) => onUpdateProjectIdentity?.(project.path, { color })}
        size={18}
      />
      <Button
        type="button"
        variant="secondary"
        size="xs"
        onClick={() => {
          onSetDefaultProject?.(project.path)
          trackEvent('project_default_changed', {
            workspace_alias: workspace.alias,
          })
        }}
        disabled={!onSetDefaultProject || workspace.defaultForNewNotes}
        data-testid={`settings-project-default-${workspace.alias}`}
      >
        {workspace.defaultForNewNotes ? t('project.manager.default') : t('project.manager.makeDefault')}
      </Button>
      {onRequestRemoveProject && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRequestRemoveProject}
          disabled={workspace.defaultForNewNotes}
          aria-label={removeLabel}
          title={removeLabel}
          data-testid={`settings-project-remove-${workspace.alias}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
        </Button>
      )}
    </div>
  )
}

function ProjectRemovalConfirmation({
  locale,
  onCancel,
  onConfirm,
  workspace,
}: Pick<ProjectSettingsRowsProps, 'locale'> & {
  onCancel: () => void
  onConfirm: () => void
  workspace: ReturnType<typeof workspaceIdentityFromVault>
}) {
  const t = createTranslator(locale)
  const title = t('status.project.removeConfirmTitle')

  return (
    <fieldset
      aria-label={title}
      className="rounded-md border border-destructive/40 bg-destructive/5 p-3"
      data-testid={`settings-project-remove-confirm-${workspace.alias}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.stopPropagation()
        onCancel()
      }}
    >
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">
        {t('status.project.removeConfirmMessage', { label: workspace.label })}
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="xs" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="button" variant="destructive" size="xs" onClick={onConfirm}>
          {t('status.project.removeConfirmAction')}
        </Button>
      </div>
    </fieldset>
  )
}

function ProjectSettingsRow(
  options: Pick<
    ProjectSettingsRowsProps,
    'defaultProjectPath' | 'locale' | 'onSetDefaultProject' | 'onUpdateProjectIdentity' | 'projects'
  > & {
    onCancelRemoveProject: () => void
    onConfirmRemoveProject?: () => void
    onMoveVault?: (path: string, direction: VaultMoveDirection) => void
    onRequestRemoveProject?: () => void
    pendingRemoval: boolean
    project: VaultOption
  },
) {
  const {
    defaultProjectPath,
    locale,
    onCancelRemoveProject,
    onConfirmRemoveProject,
    onMoveVault,
    onRequestRemoveProject,
    onSetDefaultProject,
    onUpdateProjectIdentity,
    projects,
    project,
    pendingRemoval,
  } = options
  const workspace = workspaceIdentityFromVault(project, { defaultWorkspacePath: defaultProjectPath })
  const canEdit = !!onUpdateProjectIdentity && project.path !== '' && !project.managedDefault

  return (
    <div className="grid gap-3 px-4 py-4" data-testid={`settings-project-row-${workspace.alias}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-[220px] flex-1">
          <div className="truncate text-sm font-medium text-foreground">{workspace.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{workspace.path}</div>
        </div>
        <ProjectRowActions
          canEdit={canEdit}
          canMoveDown={canMoveVaultPath(projects, project.path, 'down')}
          canMoveUp={canMoveVaultPath(projects, project.path, 'up')}
          locale={locale}
          onMoveVault={onMoveVault}
          onSetDefaultProject={onSetDefaultProject}
          onUpdateProjectIdentity={onUpdateProjectIdentity}
          onRequestRemoveProject={onRequestRemoveProject}
          workspace={workspace}
          project={project}
        />
      </div>
      {pendingRemoval && onConfirmRemoveProject && (
        <ProjectRemovalConfirmation
          locale={locale}
          onCancel={onCancelRemoveProject}
          onConfirm={onConfirmRemoveProject}
          workspace={workspace}
        />
      )}
      <ProjectIdentityInputs
        canEdit={canEdit}
        locale={locale}
        onUpdateProjectIdentity={onUpdateProjectIdentity}
        project={project}
      />
    </div>
  )
}

function moveProjectInList(
  projects: VaultOption[],
  onReorderProjects: ((orderedPaths: string[]) => void) | undefined,
  path: string,
  direction: VaultMoveDirection,
) {
  const orderedPaths = moveVaultPath(projects, path, direction)
  if (orderedPaths) onReorderProjects?.(orderedPaths)
}

export function ProjectSettingsRows({
  defaultProjectPath,
  locale,
  onRemoveProject,
  onReorderProjects,
  onSetDefaultProject,
  onUpdateProjectIdentity,
  projects,
}: ProjectSettingsRowsProps) {
  const [pendingRemovalPath, setPendingRemovalPath] = useState<string | null>(null)

  const moveProject = (path: string, direction: VaultMoveDirection) => {
    moveProjectInList(projects, onReorderProjects, path, direction)
  }

  return (
    <SettingsGroupItem testId="settings-project-list">
      <div className="-mx-4 divide-y divide-border">
        {projects.map((project) => (
          <ProjectSettingsRow
            key={project.path}
            defaultProjectPath={defaultProjectPath}
            locale={locale}
            onCancelRemoveProject={() => setPendingRemovalPath(null)}
            onConfirmRemoveProject={
              onRemoveProject
                ? () => {
              onRemoveProject(project.path)
              setPendingRemovalPath(null)
                  }
                : undefined
            }
            onMoveVault={onReorderProjects ? moveProject : undefined}
            onRequestRemoveProject={onRemoveProject ? () => setPendingRemovalPath(project.path) : undefined}
            onSetDefaultProject={onSetDefaultProject}
            onUpdateProjectIdentity={onUpdateProjectIdentity}
            pendingRemoval={pendingRemovalPath === project.path}
            projects={projects}
            project={project}
          />
        ))}
      </div>
    </SettingsGroupItem>
  )
}
