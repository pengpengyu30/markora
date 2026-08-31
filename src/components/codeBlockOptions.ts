import { codeBlockOptions } from '@blocknote/code-block'
import type { CodeBlockOptions } from '@blocknote/core'
import {
  canonicalKnownCodeBlockLanguage,
  codeBlockLanguageOptions,
  EXTRA_CODE_BLOCK_LANGUAGES,
  GO_CODE_BLOCK_LANGUAGE,
} from '../utils/codeBlockLanguageCatalog'
import {
  DEFAULT_EDITOR_THEME_ID,
  resolveEffectiveEditorTheme,
  type EffectiveEditorTheme,
} from '../editorThemes/editorThemeCatalog'
import { normalizeResolvedThemeMode } from '../lib/themeMode'
import { supportsShikiRegexFeatures } from '../utils/regexCapabilities'

const GO_LANGUAGE_REGISTRATION = {
  name: 'go',
  displayName: 'Go',
  scopeName: 'source.go',
  aliases: ['golang'],
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#keywords' },
    { include: '#numbers' },
  ],
  repository: {
    comments: {
      patterns: [
        { begin: '/\\*', end: '\\*/', name: 'comment.block.go' },
        { begin: '//', end: '$', name: 'comment.line.double-slash.go' },
      ],
    },
    keywords: {
      patterns: [
        {
          match: '\\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)\\b',
          name: 'keyword.control.go',
        },
      ],
    },
    numbers: {
      patterns: [
        { match: '\\b0[xX][0-9a-fA-F_]+\\b|\\b\\d[\\d_]*(\\.\\d[\\d_]*)?\\b', name: 'constant.numeric.go' },
      ],
    },
    strings: {
      patterns: [
        { begin: '"', end: '"', name: 'string.quoted.double.go' },
        { begin: '`', end: '`', name: 'string.quoted.raw.go' },
      ],
    },
  },
}

type TolariaCodeHighlighter = Awaited<ReturnType<NonNullable<typeof codeBlockOptions.createHighlighter>>>
type TolariaLoadLanguage = TolariaCodeHighlighter['loadLanguage']
type TolariaLanguageInput = Parameters<TolariaLoadLanguage>[number]
type TolariaLanguageLoader = () => Promise<TolariaLanguageInput[]>
type TolariaNamedLanguageRegistration = Record<string, unknown> & {
  name: string
  displayName?: string
  aliases?: string[]
}

const GO_LANGUAGE = codeBlockLanguageOptions([GO_CODE_BLOCK_LANGUAGE]).go
const EXTRA_SUPPORTED_LANGUAGES = codeBlockLanguageOptions(EXTRA_CODE_BLOCK_LANGUAGES)

type TolariaShikiTheme = {
  name: string
  displayName: string
  type: 'light' | 'dark'
  fg: string
  bg: string
  settings: Array<{
    scope?: string | string[]
    settings: {
      foreground?: string
      background?: string
      fontStyle?: string
    }
  }>
  colors: Record<string, string>
}

type TolariaThemeInput = Parameters<TolariaCodeHighlighter['loadTheme']>[0]

type TolariaCodeThemeController = {
  highlighter: TolariaCodeHighlighter
  currentThemeName: string
  pendingThemeLoad: Promise<void>
}

let activeEditorTheme: EffectiveEditorTheme | null = null
const codeThemeControllers = new Set<TolariaCodeThemeController>()

function syntaxRule(
  scope: string | string[],
  foreground: string,
  fontStyle?: string,
): TolariaShikiTheme['settings'][number] {
  return {
    scope,
    settings: {
      foreground,
      ...(fontStyle ? { fontStyle } : {}),
    },
  }
}

export function editorThemeShikiName(theme: Pick<EffectiveEditorTheme, 'id' | 'variant'>): string {
  return `tolaria-${theme.id}-${theme.variant}`
}

export function createTolariaShikiTheme(theme: EffectiveEditorTheme): TolariaShikiTheme {
  const { syntax } = theme.tokens

  return {
    name: editorThemeShikiName(theme),
    displayName: `Tolaria ${theme.displayName} ${theme.variant}`,
    type: theme.variant,
    fg: syntax.foreground,
    bg: syntax.codeSurface,
    settings: [
      { settings: { foreground: syntax.foreground, background: syntax.codeSurface } },
      syntaxRule(['punctuation', 'meta.brace', 'meta.delimiter'], syntax.mutedPunctuation),
      syntaxRule(['comment', 'comment.block', 'comment.line'], syntax.comment, 'italic'),
      syntaxRule(['keyword', 'storage', 'storage.type', 'storage.modifier'], syntax.keyword),
      syntaxRule(['string', 'string.quoted', 'constant.other'], syntax.string),
      syntaxRule(['constant.numeric', 'constant.language', 'support.constant'], syntax.number),
      syntaxRule(['entity.name.type', 'support.type', 'entity.name.class'], syntax.typeClass),
      syntaxRule(['entity.name.function', 'support.function', 'meta.function-call'], syntax.function),
      syntaxRule(['variable', 'variable.other.property', 'variable.other.object.property'], syntax.variableProperty),
      syntaxRule(['keyword.operator', 'punctuation.definition.operator'], syntax.operator),
      syntaxRule(['entity.other.attribute-name', 'entity.other.inherited-class'], syntax.tagAttribute),
      syntaxRule(['invalid', 'invalid.illegal', 'invalid.deprecated'], syntax.invalidError),
    ],
    colors: {
      'editor.background': syntax.codeSurface,
      'editor.foreground': syntax.foreground,
      'editor.selectionBackground': syntax.selection,
      'editor.lineHighlightBackground': syntax.activeLine,
      'editorIndentGuide.background': syntax.codeBorder,
    },
  }
}

function currentEditorTheme(): EffectiveEditorTheme {
  if (typeof document === 'undefined') {
    return resolveEffectiveEditorTheme(DEFAULT_EDITOR_THEME_ID, 'light')
  }

  const root = document.documentElement
  const variant = normalizeResolvedThemeMode(root.dataset.theme)
    ?? (root.classList.contains('dark') ? 'dark' : 'light')
  return resolveEffectiveEditorTheme(root.dataset.editorTheme, variant)
}

function prioritizeTheme(themes: string[], theme: string) {
  return [theme, ...themes.filter((candidate) => candidate !== theme)]
}

function queueEditorThemeLoad(
  controller: TolariaCodeThemeController,
  theme: EffectiveEditorTheme,
): Promise<void> {
  const shikiTheme = createTolariaShikiTheme(theme)
  controller.currentThemeName = shikiTheme.name
  controller.pendingThemeLoad = controller.pendingThemeLoad.then(async () => {
    await controller.highlighter.loadTheme(shikiTheme as TolariaThemeInput)
  })
  return controller.pendingThemeLoad
}

export async function setTolariaCodeHighlightingTheme(theme: EffectiveEditorTheme): Promise<void> {
  activeEditorTheme = theme
  await Promise.all([...codeThemeControllers].map(controller => queueEditorThemeLoad(controller, theme)))
}

function languageInputs(languages: readonly TolariaLanguageInput[]): TolariaLanguageInput[] {
  return [...languages]
}

function languageModuleInputs(languageModule: unknown): TolariaLanguageInput[] {
  if (typeof languageModule !== 'object' || languageModule === null) return []

  const defaultExport = (languageModule as { default?: unknown }).default
  return Array.isArray(defaultExport) ? languageInputs(defaultExport as TolariaLanguageInput[]) : []
}

async function optionalLanguageInputs(importLanguage: () => Promise<unknown>): Promise<TolariaLanguageInput[]> {
  try {
    return languageModuleInputs(await importLanguage())
  } catch {
    return []
  }
}

function namedLanguageRegistration(value: TolariaLanguageInput): TolariaNamedLanguageRegistration | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return typeof record.name === 'string'
    ? record as TolariaNamedLanguageRegistration
    : null
}

function renameLanguageRegistration(
  languages: readonly TolariaLanguageInput[],
  sourceName: string,
  nextLanguage: { name: string; displayName: string; aliases: string[] },
): TolariaLanguageInput[] {
  return languages.map((language) => {
    const registration = namedLanguageRegistration(language)
    if (!registration || registration.name !== sourceName) return language
    return { ...registration, ...nextLanguage } as TolariaLanguageInput
  })
}

async function loadVbScriptLanguage(): Promise<TolariaLanguageInput[]> {
  const language = await optionalLanguageInputs(() => import('@shikijs/langs/vb'))
  return renameLanguageRegistration(language, 'vb', {
    name: 'vbscript',
    displayName: 'VBScript',
    aliases: ['vb', 'vbs', 'vba', 'visual-basic', 'visualbasic'],
  })
}

const EXTRA_LANGUAGE_LOADERS = new Map<string, TolariaLanguageLoader>([
  ['powershell', async () => optionalLanguageInputs(() => import('@shikijs/langs/powershell'))],
  ['vbscript', loadVbScriptLanguage],
  ['dart', async () => optionalLanguageInputs(() => import('@shikijs/langs/dart'))],
  ['groovy', async () => optionalLanguageInputs(() => import('@shikijs/langs/groovy'))],
  ['matlab', async () => optionalLanguageInputs(() => import('@shikijs/langs/matlab'))],
  ['perl', async () => optionalLanguageInputs(() => import('@shikijs/langs/perl'))],
  ['elixir', async () => optionalLanguageInputs(() => import('@shikijs/langs/elixir'))],
  ['erlang', async () => optionalLanguageInputs(() => import('@shikijs/langs/erlang'))],
  ['fsharp', async () => optionalLanguageInputs(() => import('@shikijs/langs/fsharp'))],
  ['clojure', async () => optionalLanguageInputs(() => import('@shikijs/langs/clojure'))],
  ['asm', async () => optionalLanguageInputs(() => import('@shikijs/langs/asm'))],
  ['zig', async () => optionalLanguageInputs(() => import('@shikijs/langs/zig'))],
  ['hcl', async () => optionalLanguageInputs(() => import('@shikijs/langs/hcl'))],
  ['terraform', async () => optionalLanguageInputs(() => import('@shikijs/langs/terraform'))],
  ['dockerfile', async () => optionalLanguageInputs(() => import('@shikijs/langs/dockerfile'))],
  ['batch', async () => optionalLanguageInputs(() => import('@shikijs/langs/bat'))],
  ['diff', async () => optionalLanguageInputs(() => import('@shikijs/langs/diff'))],
  ['ini', async () => optionalLanguageInputs(() => import('@shikijs/langs/ini'))],
  ['toml', async () => optionalLanguageInputs(() => import('@shikijs/langs/toml'))],
])

function expandGoLanguage(language: string): TolariaLanguageInput[] | null {
  return canonicalKnownCodeBlockLanguage(language) === 'go'
    ? [GO_LANGUAGE_REGISTRATION as TolariaLanguageInput]
    : null
}

async function expandExternalLanguage(language: string): Promise<TolariaLanguageInput[] | null> {
  const canonicalLanguage = canonicalKnownCodeBlockLanguage(language) ?? language.trim().toLowerCase()
  const loadLanguage = EXTRA_LANGUAGE_LOADERS.get(canonicalLanguage)
  return loadLanguage ? loadLanguage() : null
}

async function expandLanguage(language: TolariaLanguageInput): Promise<TolariaLanguageInput[]> {
  if (typeof language !== 'string') return [language]
  return expandGoLanguage(language) ?? await expandExternalLanguage(language) ?? [language]
}

async function createTolariaCodeHighlighter(): Promise<TolariaCodeHighlighter> {
  const highlighter = await codeBlockOptions.createHighlighter()
  const controller: TolariaCodeThemeController = {
    currentThemeName: '',
    highlighter,
    pendingThemeLoad: Promise.resolve(),
  }
  codeThemeControllers.add(controller)
  try {
    await queueEditorThemeLoad(controller, activeEditorTheme ?? currentEditorTheme())
  } catch (error) {
    codeThemeControllers.delete(controller)
    throw error
  }

  return {
    ...highlighter,
    getLoadedThemes: () => prioritizeTheme(highlighter.getLoadedThemes(), controller.currentThemeName),
    loadLanguage: async (...languages) => {
      const expandedLanguages = await Promise.all(languages.map(expandLanguage))
      return highlighter.loadLanguage(...expandedLanguages.flat())
    },
  }
}

export function createTolariaCodeBlockOptions(): Partial<CodeBlockOptions> {
  const options: Partial<CodeBlockOptions> = {
    ...codeBlockOptions,
    createHighlighter: createTolariaCodeHighlighter,
    defaultLanguage: 'text',
    supportedLanguages: {
      ...codeBlockOptions.supportedLanguages,
      go: GO_LANGUAGE,
      ...EXTRA_SUPPORTED_LANGUAGES,
    },
  }

  if (supportsShikiRegexFeatures()) return options

  delete options.createHighlighter
  return options
}
