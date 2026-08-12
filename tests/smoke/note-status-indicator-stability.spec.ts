import { test, expect, type Page } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

const STATUS_DOT_SELECTOR = [
  '[data-testid="unsaved-indicator"]',
  '[data-testid="pending-save-indicator"]',
].join(',')

interface StatusDotSample {
  className: string | null
  testId: string | null
}

interface StatusDotSampleWindow {
  __noteStatusDotSampler?: number
  __noteStatusDotSamples?: StatusDotSample[]
}

let tempVaultDir: string

async function startStatusDotSampler(page: Page) {
  await page.evaluate((selector) => {
    const sampleWindow = window as typeof window & StatusDotSampleWindow
    sampleWindow.__noteStatusDotSamples = []
    const sample = () => {
      const dot = document.querySelector(selector) as HTMLElement | null
      sampleWindow.__noteStatusDotSamples?.push({
        className: dot?.className ?? null,
        testId: dot?.dataset.testid ?? null,
      })
    }

    sample()
    sampleWindow.__noteStatusDotSampler = window.setInterval(sample, 100)
  }, STATUS_DOT_SELECTOR)
}

async function stopStatusDotSampler(page: Page): Promise<StatusDotSample[]> {
  return page.evaluate(() => {
    const sampleWindow = window as typeof window & StatusDotSampleWindow
    if (sampleWindow.__noteStatusDotSampler !== undefined) {
      window.clearInterval(sampleWindow.__noteStatusDotSampler)
      sampleWindow.__noteStatusDotSampler = undefined
    }
    return sampleWindow.__noteStatusDotSamples ?? []
  })
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000)
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVaultDesktopHarness(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('note status indicator is transient while typing and autosave @smoke', async ({ page }) => {
  await page.getByRole('option').first().click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toBeVisible({ timeout: 5_000 })
  await startStatusDotSampler(page)
  await page.locator('.bn-editor').click()
  await page.keyboard.type('The sidebar status dot should stay steady while this note is edited. ', {
    delay: 25,
  })
  await expect(page.locator(STATUS_DOT_SELECTOR).first()).toBeVisible({ timeout: 5_000 })
  await page.waitForTimeout(1_800)

  const samples = await stopStatusDotSampler(page)
  expect(samples.length).toBeGreaterThan(0)
  expect(samples.some((sample) => sample.testId === 'unsaved-indicator')).toBe(true)
  expect(samples.at(-1)?.testId).toBeNull()
  expect(samples.filter((sample) => sample.className?.includes('tab-status-pulse'))).toEqual([])
})
