import { type Page, expect } from '@playwright/test'

const COMMAND_INPUT = 'input[placeholder="Type a command..."]'
type KeyboardModifier = 'Meta' | 'Control' | 'Shift' | 'Alt'
const COMMAND_MODIFIER: KeyboardModifier = process.platform === 'darwin' ? 'Meta' : 'Control'

export async function openCommandPalette(page: Page): Promise<void> {
  const input = page.locator(COMMAND_INPUT)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator('body').click()
    await sendShortcut(page, 'k', ['Control'])

    try {
      await input.waitFor({ state: 'visible', timeout: 2_000 })
      return
    } catch {
      if (attempt === 2) {
        throw new Error('Command palette did not open after 3 shortcut attempts')
      }
    }
  }
}

export async function closeCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.locator(COMMAND_INPUT)).not.toBeVisible()
}

export async function findCommand(
  page: Page,
  name: string,
): Promise<boolean> {
  await page.locator(COMMAND_INPUT).fill(name)
  const match = page.locator('[data-selected="true"]').first()
  try {
    await match.waitFor({ timeout: 2_000 })
    const text = await match.textContent()
    return text?.toLowerCase().includes(name.toLowerCase()) ?? false
  } catch {
    return false
  }
}

export async function executeCommand(
  page: Page,
  name: string,
): Promise<void> {
  await page.locator(COMMAND_INPUT).fill(name)
  const match = page.locator('[data-selected="true"]').first()
  await match.waitFor({ timeout: 2_000 })
  await page.keyboard.press('Enter')
}

export async function verifyVisible(
  page: Page,
  selector: string,
): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible()
}

export async function verifyFocusable(
  page: Page,
  selector: string,
): Promise<void> {
  const el = page.locator(selector).first()
  await expect(el).toBeVisible()
  await el.focus()
  await expect(el).toBeFocused()
}

export async function sendShortcut(
  page: Page,
  key: string,
  modifiers: KeyboardModifier[] = [],
): Promise<void> {
  const normalizedModifiers = modifiers.map((modifier) =>
    modifier === 'Control' ? COMMAND_MODIFIER : modifier,
  )
  const combo = [...new Set(normalizedModifiers), key].join('+')
  await page.keyboard.press(combo)
}
