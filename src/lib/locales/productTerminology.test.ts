import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type TranslationCatalog = Record<string, string>

const localeDirectory = `${process.cwd()}/src/lib/locales`

function readCatalog(filename: string): TranslationCatalog {
  return JSON.parse(readFileSync(`${localeDirectory}/${filename}`, 'utf8')) as TranslationCatalog
}

function readCatalogs(): Array<{ filename: string; catalog: TranslationCatalog }> {
  return readdirSync(localeDirectory)
    .filter((filename) => filename.endsWith('.json'))
    .sort()
    .map((filename) => ({ filename, catalog: readCatalog(filename) }))
}

describe('localized product terminology', () => {
  it('does not expose the legacy product name or English Vault terminology', () => {
    const violations = readCatalogs().flatMap(({ filename, catalog }) => (
      Object.entries(catalog)
        .filter(([, value]) => /tolaria|laputa|\bvaults?\b/i.test(value))
        .map(([key, value]) => `${filename}:${key}=${value}`)
    ))

    expect(violations).toEqual([])
  })

  it('uses Markora and Project terminology in the Simplified Chinese settings copy', () => {
    const catalog = readCatalog('zh-CN.json')

    expect(catalog['settings.appearance.description']).toContain('Markora')
    expect(catalog['settings.language.description']).toContain('Markora')
    expect(catalog['settings.vaultContent.description']).toContain('项目')
    expect(catalog['settings.vaultContent.hideGitignoredDescription']).toContain('项目')
    expect(catalog['menu.vault']).toBe('项目')
    expect(catalog['menu.edit.findInVault']).toBe('在项目中查找')
  })
})
