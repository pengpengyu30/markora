export const APP_STORAGE_KEYS = {
  theme: 'markora-theme',
  zoom: 'markora:zoom-level',
  viewMode: 'markora-view-mode',
  configMigrationFlag: 'markora:config-migrated-to-project',
  legacyMigrationFlag: 'markora:legacy-storage-migrated',
  sortPreferences: 'markora-sort-preferences',
  sidebarCollapsed: 'markora:sidebar-collapsed',
  rightPanelCollapsed: 'markora:right-panel-collapsed',
  lastActiveNotePath: 'markora:last-active-note-path',
  layoutPanels: 'markora:layout-panels',
  vaultConfig: 'markora:project-config',
  welcomeDismissed: 'markora_welcome_dismissed',
} as const

export const PREVIOUS_APP_STORAGE_KEYS = {
  theme: 'tolaria-theme',
  zoom: 'tolaria:zoom-level',
  viewMode: 'tolaria-view-mode',
  configMigrationFlag: 'tolaria:config-migrated-to-vault',
  sortPreferences: 'tolaria-sort-preferences',
  sidebarCollapsed: 'tolaria:sidebar-collapsed',
  rightPanelCollapsed: 'tolaria:right-panel-collapsed',
  layoutPanels: 'tolaria:layout-panels',
  welcomeDismissed: 'tolaria_welcome_dismissed',
} as const

export const LEGACY_APP_STORAGE_KEYS = {
  theme: 'laputa-theme',
  zoom: 'laputa:zoom-level',
  viewMode: 'laputa-view-mode',
  configMigrationFlag: 'laputa:config-migrated-to-vault',
  sortPreferences: 'laputa-sort-preferences',
  sidebarCollapsed: 'laputa:sidebar-collapsed',
  layoutPanels: 'laputa:layout-panels',
  welcomeDismissed: 'laputa_welcome_dismissed',
} as const

type MigratableStorageKey = keyof typeof PREVIOUS_APP_STORAGE_KEYS

const HISTORIC_APP_STORAGE_KEY_SETS = [PREVIOUS_APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS] as const

const MIGRATABLE_STORAGE_KEYS: MigratableStorageKey[] = [
  'theme',
  'zoom',
  'viewMode',
  'configMigrationFlag',
  'sortPreferences',
  'sidebarCollapsed',
  'layoutPanels',
  'welcomeDismissed',
]

export function copyLegacyAppStorageKeys(): void {
  try {
    if (localStorage.getItem(APP_STORAGE_KEYS.legacyMigrationFlag) === '1') return

    for (const key of MIGRATABLE_STORAGE_KEYS) {
      const storageKey = Reflect.get(APP_STORAGE_KEYS, key) as string
      if (localStorage.getItem(storageKey) !== null) continue

      for (const historicKeys of HISTORIC_APP_STORAGE_KEY_SETS) {
        const historicStorageKey = Reflect.get(historicKeys, key) as string | undefined
        if (!historicStorageKey) continue
        const historicValue = localStorage.getItem(historicStorageKey)
        if (historicValue === null) continue
        localStorage.setItem(storageKey, historicValue)
        break
      }
    }

    localStorage.setItem(APP_STORAGE_KEYS.legacyMigrationFlag, '1')
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

export function getAppStorageItem(key: MigratableStorageKey): string | null {
  try {
    const storageKey = Reflect.get(APP_STORAGE_KEYS, key) as string
    const currentValue = localStorage.getItem(storageKey)
    if (currentValue !== null) return currentValue

    for (const historicKeys of HISTORIC_APP_STORAGE_KEY_SETS) {
      const historicStorageKey = Reflect.get(historicKeys, key) as string | undefined
      if (!historicStorageKey) continue
      const historicValue = localStorage.getItem(historicStorageKey)
      if (historicValue !== null) return historicValue
    }

    return null
  } catch {
    return null
  }
}
