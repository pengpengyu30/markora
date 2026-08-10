import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadHandlers() {
  vi.resetModules()
  return import('./mock-handlers')
}

describe('mockHandlers additional coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renames a filename successfully and rewrites wikilinks that target the old path stem', async () => {
    const { mockHandlers } = await loadHandlers()
    const vaultPath = '/Users/mock/Test Vault'
    const sourcePath = `${vaultPath}/meeting-notes.md`
    const backlinkPath = `${vaultPath}/backlinks.md`

    mockHandlers.save_note_content({
      path: sourcePath,
      content: '# Meeting Notes',
    })
    mockHandlers.save_note_content({
      path: backlinkPath,
      content: 'Links: [[meeting-notes]] and [[Meeting Notes|alias]].',
    })

    expect(mockHandlers.rename_note_filename({
      vault_path: vaultPath,
      old_path: sourcePath,
      new_filename_stem: 'weekly-notes',
    })).toEqual({
      new_path: `${vaultPath}/weekly-notes.md`,
      updated_files: 1,
      failed_updates: 0,
    })

    const content = mockHandlers.get_all_content() as Record<string, string>
    expect(content[`${vaultPath}/weekly-notes.md`]).toBe('# Meeting Notes')
    expect(content[backlinkPath]).toBe('Links: [[weekly-notes]] and [[Meeting Notes|alias]].')
  })

  it('persists last-vault state and reports vault existence', async () => {
    const { mockHandlers } = await loadHandlers()

    expect(mockHandlers.get_last_vault_path()).toBe('/Users/mock/demo-vault-v2')
    expect(mockHandlers.set_last_vault_path({ path: '/Users/mock/Documents/Work' })).toBeNull()
    expect(mockHandlers.get_last_vault_path()).toBe('/Users/mock/Documents/Work')

    expect(mockHandlers.check_vault_exists({ path: '/tmp/demo-vault-v2-copy' })).toBe(true)
    expect(mockHandlers.check_vault_exists({ path: '/tmp/random-vault' })).toBe(false)

    expect(mockHandlers.repair_vault()).toBe('Vault repaired')
  })

  it('persists theme mode through the mock settings backend', async () => {
    const { mockHandlers } = await loadHandlers()
    const settings = mockHandlers.get_settings()

    mockHandlers.save_settings({
      settings: {
        ...settings,
        theme_mode: 'dark',
      },
    })

    expect(mockHandlers.get_settings()).toEqual(expect.objectContaining({
      theme_mode: 'dark',
    }))
  })
})
