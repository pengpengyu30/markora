import type { Settings } from '../types'

export function areGitFeaturesEnabled(
  settings: Pick<Settings, 'git_enabled'> | null | undefined,
): boolean {
  return settings?.git_enabled === true
}
