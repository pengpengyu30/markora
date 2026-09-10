import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

test('opens a non-git vault without Git initialization by default @smoke', async ({ page }) => {
  const tempVaultDir = createFixtureVaultCopy()

  try {
    await openFixtureVault(page, tempVaultDir, { isGitRepo: false })

    await expect(page.getByTestId('note-list-container')).toBeVisible()
    await expect(page.getByText('Alpha Project', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Enable Git for this vault?' })).not.toBeVisible()
    expect(fs.existsSync(path.join(tempVaultDir, '.git'))).toBe(false)

    await openCommandPalette(page)
    await executeCommand(page, 'Open Settings')
    const gitSwitch = page.getByTestId('settings-git-enabled').getByRole('switch')
    await expect(gitSwitch).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByTestId('settings-hide-gitignored-files').getByRole('switch')).toBeDisabled()

    await gitSwitch.click()
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-panel')).not.toBeVisible()

    await openCommandPalette(page)
    await executeCommand(page, 'Open Settings')
    await expect(page.getByTestId('settings-git-enabled').getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('settings-hide-gitignored-files').getByRole('switch')).toBeEnabled()
    await page.keyboard.press('Escape')
  } finally {
    removeFixtureVaultCopy(tempVaultDir)
  }
})

test('opens an existing Markdown file in rich preview without rewriting it @smoke', async ({ page }) => {
  const tempVaultDir = createFixtureVaultCopy()
  const notePath = path.join(tempVaultDir, 'note', 'editor-themes-phase-0.md')
  const originalContent = fs.readFileSync(notePath, 'utf8')
  const saveRequests: string[] = []

  page.on('request', (request) => {
    if (request.url().endsWith('/api/vault/save') && request.method() === 'POST') {
      saveRequests.push(request.postData() ?? '')
    }
  })

  try {
    // A stale global Raw preference must not change the rich-preview default
    // for a newly opened Project.
    await openFixtureVault(page, tempVaultDir, {
      editorMode: null,
      isGitRepo: false,
      legacyEditorMode: 'raw',
    })

    await page.getByTestId('note-list-container').getByText('Editor Themes Phase 0', { exact: true }).click()
    await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('raw-editor-codemirror')).not.toBeVisible()
    await expect(page.locator('.bn-editor strong').filter({ hasText: 'bold' }).first()).toHaveText('bold')

    await page.waitForTimeout(1_200)

    expect(saveRequests).toEqual([])
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)
  } finally {
    removeFixtureVaultCopy(tempVaultDir)
  }
})

test('preserves Markdown layout when editing one rich-preview line @smoke', async ({ page }) => {
  const tempVaultDir = createFixtureVaultCopy()
  const notePath = path.join(tempVaultDir, 'note', 'source-preservation.md')
  const originalContent = [
    '---',
    'title: Source Preservation',
    '---',
    '# Source Preservation',
    '',
    '1. Parent',
    '',
    '   1. Child',
    '',
    '      ~~~markdown',
    '      # Inner Markdown',
    '',
    '      **bold** and `inline code`',
    '      ~~~',
    '',
    '2. Keep this line',
    '',
  ].join('\n')
  fs.writeFileSync(notePath, originalContent)

  try {
    await openFixtureVault(page, tempVaultDir, { editorMode: null, isGitRepo: false })
    await page.getByTestId('note-list-container').getByText('Source Preservation', { exact: true }).click()

    const editableLine = page.locator('.bn-editor p').filter({ hasText: 'Keep this line' }).first()
    await expect(editableLine).toBeVisible({ timeout: 10_000 })
    await editableLine.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' edited')

    await page.waitForTimeout(1_500)

    expect(fs.readFileSync(notePath, 'utf8')).toBe(
      originalContent.replace('2. Keep this line', '2. Keep this line edited'),
    )
  } finally {
    removeFixtureVaultCopy(tempVaultDir)
  }
})
