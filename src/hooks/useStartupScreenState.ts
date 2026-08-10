import { useMemo } from 'react'

interface StartupOnboardingState {
  status: string
  vaultPath?: string
}

interface StartupVaultSwitcherState {
  allVaults: Array<{ path: string }>
  loaded: boolean
  vaultPath: string
}

interface UseStartupScreenStateArgs {
  onboardingState: StartupOnboardingState
  runtimeMissingVaultPath: string | null
  selectedVaultPath: string | null
  settingsLoaded: boolean
  telemetryConsent: boolean | null
  vaultIsLoading: boolean
  vaultSwitcher: StartupVaultSwitcherState
}

interface StartupScreenState {
  isStartupLoading: boolean
  isVaultContentLoading: boolean
  shouldResumeFreshStartOnboarding: boolean
  shouldShowStartupScreen: boolean
}

interface ShouldShowStartupScreenArgs {
  isStartupLoading: boolean
  onboardingState: StartupOnboardingState
  runtimeMissingVaultPath: string | null
  settingsLoaded: boolean
  shouldResumeFreshStartOnboarding: boolean
  telemetryConsent: boolean | null
}

function shouldResumeFreshStart(
  onboardingState: StartupOnboardingState,
  selectedVaultPath: string | null,
  vaultSwitcher: StartupVaultSwitcherState,
): boolean {
  if (onboardingState.status !== 'ready' || !vaultSwitcher.loaded) return false

  const remembersOnlyImplicitDefaultVault = selectedVaultPath === null
  const hasOneRegisteredVault = vaultSwitcher.allVaults.length === 1
  const registeredVaultPath = vaultSwitcher.allVaults[0]?.path
  const switcherOwnsOnboardingVault = onboardingState.vaultPath === vaultSwitcher.vaultPath

  return (
    remembersOnlyImplicitDefaultVault &&
    hasOneRegisteredVault &&
    registeredVaultPath === vaultSwitcher.vaultPath &&
    switcherOwnsOnboardingVault
  )
}

function needsTelemetryConsent(
  isStartupLoading: boolean,
  settingsLoaded: boolean,
  telemetryConsent: boolean | null,
): boolean {
  return !isStartupLoading && settingsLoaded && telemetryConsent === null
}

function shouldShowStartupScreenForState(options: ShouldShowStartupScreenArgs): boolean {
  const {
    isStartupLoading,
    onboardingState,
    runtimeMissingVaultPath,
    settingsLoaded,
    shouldResumeFreshStartOnboarding,
    telemetryConsent,
  } = options
  const startupReasons = [
    needsTelemetryConsent(isStartupLoading, settingsLoaded, telemetryConsent),
    Boolean(runtimeMissingVaultPath),
    onboardingState.status === 'welcome',
    onboardingState.status === 'vault-missing',
    shouldResumeFreshStartOnboarding,
  ]
  return startupReasons.some(Boolean)
}

function isVaultContentLoading(
  isStartupLoading: boolean,
  onboardingState: StartupOnboardingState,
  vaultIsLoading: boolean,
): boolean {
  const readyVaultIsLoading = onboardingState.status === 'ready' && vaultIsLoading
  return isStartupLoading || readyVaultIsLoading
}

export function useStartupScreenState(options: UseStartupScreenStateArgs): StartupScreenState {
  const {
    onboardingState,
    runtimeMissingVaultPath,
    selectedVaultPath,
    settingsLoaded,
    telemetryConsent,
    vaultIsLoading,
    vaultSwitcher,
  } = options
  const shouldResumeFreshStartOnboarding = useMemo(
    () => shouldResumeFreshStart(onboardingState, selectedVaultPath, vaultSwitcher),
    [onboardingState, selectedVaultPath, vaultSwitcher],
  )

  const isStartupLoading = onboardingState.status === 'loading'
  const shouldShowStartupScreen = shouldShowStartupScreenForState({
    isStartupLoading,
    onboardingState,
    runtimeMissingVaultPath,
    settingsLoaded,
    shouldResumeFreshStartOnboarding,
    telemetryConsent,
  })
  const vaultContentLoading = isVaultContentLoading(isStartupLoading, onboardingState, vaultIsLoading)

  return {
    isStartupLoading,
    isVaultContentLoading: vaultContentLoading,
    shouldResumeFreshStartOnboarding,
    shouldShowStartupScreen,
  }
}
