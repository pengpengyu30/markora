import { Toast } from './Toast'
import { WelcomeScreen } from './WelcomeScreen'
import type { useOnboarding } from '../hooks/useOnboarding'
import type { useVaultSwitcher } from '../hooks/useVaultSwitcher'
import type { AppLocale } from '../lib/i18n'

type OnboardingState = ReturnType<typeof useOnboarding>
type VaultSwitcherState = ReturnType<typeof useVaultSwitcher>
export interface StartupScreenParams {
  isOffline: boolean
  isStartupLoading: boolean
  locale?: AppLocale
  onboarding: OnboardingState
  runtimeMissingVaultPath: string | null
  shouldResumeFreshStartOnboarding: boolean
  setToastMessage: (message: string | null) => void
  toastMessage: string | null
  vaultSwitcher: VaultSwitcherState
}

function shouldShowWelcomeView(params: StartupScreenParams): boolean {
  return Boolean(params.runtimeMissingVaultPath)
    || params.onboarding.state.status === 'welcome'
    || params.onboarding.state.status === 'vault-missing'
    || params.shouldResumeFreshStartOnboarding
}

function welcomeOnboardingState(params: StartupScreenParams): OnboardingState {
  if (params.runtimeMissingVaultPath) {
    return {
      ...params.onboarding,
      state: {
        status: 'vault-missing' as const,
        vaultPath: params.runtimeMissingVaultPath,
        defaultPath: params.vaultSwitcher.defaultPath || params.runtimeMissingVaultPath,
      },
    }
  }
  if (params.shouldResumeFreshStartOnboarding) {
    return { ...params.onboarding, state: { status: 'welcome' as const, defaultPath: params.vaultSwitcher.vaultPath } }
  }
  return params.onboarding
}

function WelcomeView({ onboarding, isOffline, locale }: { onboarding: OnboardingState; isOffline: boolean; locale?: AppLocale }) {
  const state = onboarding.state as { status: 'welcome' | 'vault-missing'; defaultPath: string; vaultPath?: string }
  return (
    <div className="app-shell">
      <WelcomeScreen
        mode={state.status === 'welcome' ? 'welcome' : 'vault-missing'}
        missingPath={state.status === 'vault-missing' ? state.vaultPath : undefined}
        locale={locale}
        defaultVaultPath={state.defaultPath}
        onCreateVault={onboarding.handleCreateVault}
        onRetryCreateVault={onboarding.retryCreateVault}
        onCreateEmptyVault={onboarding.handleCreateEmptyVault}
        onOpenFolder={onboarding.handleOpenFolder}
        isOffline={isOffline}
        creatingAction={onboarding.creatingAction}
        error={onboarding.error}
        canRetryTemplate={onboarding.canRetryTemplate}
      />
    </div>
  )
}

export function StartupScreen(params: StartupScreenParams) {
  if (shouldShowWelcomeView(params)) {
    return (
      <WelcomeView
        onboarding={welcomeOnboardingState(params)}
        isOffline={params.isOffline}
        locale={params.locale}
      />
    )
  }

  return <Toast message={params.toastMessage} onDismiss={() => params.setToastMessage(null)} />
}
