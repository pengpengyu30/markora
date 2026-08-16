import fs from 'fs'
import path from 'path'
import { expect, test } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

let tempVaultDir: string

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000)
  tempVaultDir = createFixtureVaultCopy()
  fs.writeFileSync(path.join(tempVaultDir, 'tag-alpha.md'), `---\ntitle: Tag Alpha\ntags:\n  - "alpha"\n  - "shared"\n---\n# Tag Alpha\n\nBody #literal\n`, 'utf8')
  fs.writeFileSync(path.join(tempVaultDir, 'tag-shared.md'), `---\ntitle: Tag Shared\ntags:\n  - "shared"\n---\n# Tag Shared\n`, 'utf8')
  await openFixtureVault(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('@smoke adds a tag, filters by it, and clears the session-only filter', async ({ page }) => {
  const noteList = page.getByTestId('note-list-container')
  await noteList.getByText('Tag Alpha', { exact: true }).click()

  await page.getByTestId('note-tag-property-add').click()
  await page.getByRole('textbox', { name: 'Add tag' }).fill('New-Tag')
  await page.getByRole('button', { name: 'Create "new-tag"' }).click()
  await expect(page.getByTestId('note-tag-row')).toContainText('new-tag')
  await expect(page.getByTestId('sidebar-tag').filter({ hasText: 'literal' })).toHaveCount(0)

  const tagsSection = page.getByTestId('sidebar-tags')
  await tagsSection.getByRole('button').click()
  const sidebarTag = page.getByTestId('sidebar-tag').filter({ hasText: 'new-tag' })
  await expect(sidebarTag).toContainText('1')
  await sidebarTag.click()

  await expect(noteList.getByText('Tag Alpha', { exact: true })).toBeVisible()
  await expect(noteList.getByText('Tag Shared', { exact: true })).not.toBeVisible()
  await expect(page.getByTestId('note-list-tag-filter')).toContainText('new-tag')

  await page.getByRole('button', { name: 'Clear tag filter' }).click()
  await expect(noteList.getByText('Tag Shared', { exact: true })).toBeVisible()

  await sidebarTag.click()
  await expect(page.getByTestId('note-list-tag-filter')).toContainText('new-tag')

  await page.reload()
  await expect(noteList.getByText('Tag Alpha', { exact: true })).toBeVisible()
  await expect(noteList.getByText('Tag Shared', { exact: true })).toBeVisible()
  await expect(page.getByTestId('note-list-tag-filter')).toHaveCount(0)
})
