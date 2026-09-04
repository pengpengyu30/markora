import { EDITOR_THEME_FONT_FAMILIES } from './editorThemeFonts'

export const EDITOR_THEME_SCHEMA_VERSION = 1 as const

export const EDITOR_THEME_IDS = ['default', 'code', 'editorial', 'canvas'] as const
export type EditorThemeId = typeof EDITOR_THEME_IDS[number]

export const DEFAULT_EDITOR_THEME_ID = 'default' as const
export const SELECTABLE_EDITOR_THEME_IDS = EDITOR_THEME_IDS

export type EditorThemeVariant = 'light' | 'dark'

interface HeadingTokens {
  fontSize: number
  fontWeight: number
  lineHeight: number
  marginTop: number
  marginBottom: number
  color: string
  letterSpacing: number
}

export interface EditorThemeSharedTokens {
  editor: {
    fontFamily: string
    headingFontFamily: string
    fontSize: number
    lineHeight: number
    maxWidth: number
    paddingHorizontal: number
    paddingVertical: number
    paragraphSpacing: number
    dividerFollowedByHeadingMarginTop: number
    rawFontFamily: string
    rawFontSize: number
    rawLineHeight: number
    uiFontFamily: string
    uiFontSize: number
    uiLineHeight: number
  }
  headings: {
    h1: HeadingTokens
    h2: HeadingTokens
    h3: HeadingTokens
    h4: HeadingTokens
  }
  lists: {
    bulletSymbol: string
    bulletSize: number
    bulletColor: string
    indentSize: number
    itemSpacing: number
    paddingLeft: number
    nestedBulletSymbols: string[]
    bulletGap: number
  }
  checkboxes: {
    size: number
    borderRadius: number
    checkedColor: string
    uncheckedBorderColor: string
    gap: number
  }
  inlineStyles: {
    bold: { fontWeight: number; color: string }
    italic: { fontStyle: string; color: string }
    strikethrough: { color: string; textDecoration: string }
    code: {
      fontFamily: string
      fontSize: number
      backgroundColor: string
      paddingHorizontal: number
      paddingVertical: number
      borderRadius: number
      color: string
    }
    link: { color: string; textDecoration: string }
    wikilink: { color: string; textDecoration: string; borderBottom: string; cursor: string }
  }
  blockquote: {
    borderLeftWidth: number
    borderLeftColor: string
    paddingLeft: number
    marginVertical: number
    color: string
    fontStyle: string
  }
  table: {
    borderColor: string
    headerBackground: string
    cellPaddingHorizontal: number
    cellPaddingVertical: number
    fontSize: number
  }
  horizontalRule: {
    color: string
    marginVertical: number
    thickness: number
  }
}

export interface EditorThemeVariantTokens {
  colors: {
    background: string
    text: string
    textSecondary: string
    textMuted: string
    heading: string
    accent: string
    selection: string
    cursor: string
  }
  surfaces: {
    canvas: string
    code: string
    inlineCode: string
    tableHeader: string
    quote: string
    callout: string
    selection: string
    activeLine: string
    gutter: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    heading: string
    inverse: string
    error: string
    code: string
    link: string
    wikilink: string
  }
  borders: {
    default: string
    subtle: string
    strong: string
    code: string
    divider: string
    gutter: string
    focus: string
  }
  accents: {
    primary: string
    primaryHover: string
    highlights: {
      red: string
      green: string
      blue: string
      purple: string
    }
  }
  feedback: {
    info: { text: string; background: string; border: string }
    success: { text: string; background: string; border: string }
    warning: { text: string; background: string; border: string }
    error: { text: string; background: string; border: string }
    note: { text: string; background: string; border: string }
    example: { text: string; background: string; border: string }
    quote: { text: string; background: string; border: string }
  }
  syntax: {
    foreground: string
    mutedPunctuation: string
    comment: string
    keyword: string
    string: string
    number: string
    typeClass: string
    function: string
    variableProperty: string
    operator: string
    tagAttribute: string
    invalidError: string
    selection: string
    activeLine: string
    codeSurface: string
    codeBorder: string
  }
  mermaid: {
    background: string
    text: string
    nodeBackground: string
    nodeBorder: string
    edge: string
    cluster: string
    accent: string
  }
  embeddedControls: {
    background: string
    text: string
    border: string
    hoverBackground: string
  }
  behavior: {
    showRichCodeBlockLineNumbers: boolean
  }
  compatibility: {
    editorCodeBlockBackground: string
    editorCodeBlockBorder: string
    editorCodeBlockText: string
    editorCodeBlockLanguage: string
  }
}

export interface EditorThemeDefinition {
  schemaVersion: typeof EDITOR_THEME_SCHEMA_VERSION
  id: EditorThemeId
  displayName: string
  descriptionKey: string
  shared: EditorThemeSharedTokens
  variants: Record<EditorThemeVariant, EditorThemeVariantTokens>
}

export type EditorThemeCatalog = readonly EditorThemeDefinition[]

export interface EffectiveEditorTheme extends EditorThemeDefinition {
  variant: EditorThemeVariant
  tokens: EditorThemeVariantTokens
}

type ShapeNode = string | { readonly [key: string]: ShapeNode }

const SHARED_TOKEN_SHAPE = {
  editor: {
    fontFamily: 'string',
    headingFontFamily: 'string',
    fontSize: 'number',
    lineHeight: 'number',
    maxWidth: 'number',
    paddingHorizontal: 'number',
    paddingVertical: 'number',
    paragraphSpacing: 'number',
    dividerFollowedByHeadingMarginTop: 'number',
    rawFontFamily: 'string',
    rawFontSize: 'number',
    rawLineHeight: 'number',
    uiFontFamily: 'string',
    uiFontSize: 'number',
    uiLineHeight: 'number',
  },
  headings: {
    h1: { fontSize: 'number', fontWeight: 'number', lineHeight: 'number', marginTop: 'number', marginBottom: 'number', color: 'string', letterSpacing: 'number' },
    h2: { fontSize: 'number', fontWeight: 'number', lineHeight: 'number', marginTop: 'number', marginBottom: 'number', color: 'string', letterSpacing: 'number' },
    h3: { fontSize: 'number', fontWeight: 'number', lineHeight: 'number', marginTop: 'number', marginBottom: 'number', color: 'string', letterSpacing: 'number' },
    h4: { fontSize: 'number', fontWeight: 'number', lineHeight: 'number', marginTop: 'number', marginBottom: 'number', color: 'string', letterSpacing: 'number' },
  },
  lists: {
    bulletSymbol: 'string',
    bulletSize: 'number',
    bulletColor: 'string',
    indentSize: 'number',
    itemSpacing: 'number',
    paddingLeft: 'number',
    nestedBulletSymbols: 'string[]',
    bulletGap: 'number',
  },
  checkboxes: {
    size: 'number',
    borderRadius: 'number',
    checkedColor: 'string',
    uncheckedBorderColor: 'string',
    gap: 'number',
  },
  inlineStyles: {
    bold: { fontWeight: 'number', color: 'string' },
    italic: { fontStyle: 'string', color: 'string' },
    strikethrough: { color: 'string', textDecoration: 'string' },
    code: { fontFamily: 'string', fontSize: 'number', backgroundColor: 'string', paddingHorizontal: 'number', paddingVertical: 'number', borderRadius: 'number', color: 'string' },
    link: { color: 'string', textDecoration: 'string' },
    wikilink: { color: 'string', textDecoration: 'string', borderBottom: 'string', cursor: 'string' },
  },
  blockquote: {
    borderLeftWidth: 'number',
    borderLeftColor: 'string',
    paddingLeft: 'number',
    marginVertical: 'number',
    color: 'string',
    fontStyle: 'string',
  },
  table: {
    borderColor: 'string',
    headerBackground: 'string',
    cellPaddingHorizontal: 'number',
    cellPaddingVertical: 'number',
    fontSize: 'number',
  },
  horizontalRule: {
    color: 'string',
    marginVertical: 'number',
    thickness: 'number',
  },
} as const satisfies ShapeNode

const VARIANT_TOKEN_SHAPE = {
  colors: {
    background: 'string', text: 'string', textSecondary: 'string', textMuted: 'string',
    heading: 'string', accent: 'string', selection: 'string', cursor: 'string',
  },
  surfaces: {
    canvas: 'string', code: 'string', inlineCode: 'string', tableHeader: 'string',
    quote: 'string', callout: 'string', selection: 'string', activeLine: 'string', gutter: 'string',
  },
  text: {
    primary: 'string', secondary: 'string', muted: 'string', heading: 'string', inverse: 'string',
    error: 'string', code: 'string', link: 'string', wikilink: 'string',
  },
  borders: {
    default: 'string', subtle: 'string', strong: 'string', code: 'string', divider: 'string',
    gutter: 'string', focus: 'string',
  },
  accents: {
    primary: 'string',
    primaryHover: 'string',
    highlights: { red: 'string', green: 'string', blue: 'string', purple: 'string' },
  },
  feedback: {
    info: { text: 'string', background: 'string', border: 'string' },
    success: { text: 'string', background: 'string', border: 'string' },
    warning: { text: 'string', background: 'string', border: 'string' },
    error: { text: 'string', background: 'string', border: 'string' },
    note: { text: 'string', background: 'string', border: 'string' },
    example: { text: 'string', background: 'string', border: 'string' },
    quote: { text: 'string', background: 'string', border: 'string' },
  },
  syntax: {
    foreground: 'string', mutedPunctuation: 'string', comment: 'string', keyword: 'string',
    string: 'string', number: 'string', typeClass: 'string', function: 'string', variableProperty: 'string',
    operator: 'string', tagAttribute: 'string', invalidError: 'string', selection: 'string',
    activeLine: 'string', codeSurface: 'string', codeBorder: 'string',
  },
  mermaid: {
    background: 'string', text: 'string', nodeBackground: 'string', nodeBorder: 'string',
    edge: 'string', cluster: 'string', accent: 'string',
  },
  embeddedControls: {
    background: 'string', text: 'string', border: 'string', hoverBackground: 'string',
  },
  behavior: { showRichCodeBlockLineNumbers: 'boolean' },
  compatibility: {
    editorCodeBlockBackground: 'string', editorCodeBlockBorder: 'string',
    editorCodeBlockText: 'string', editorCodeBlockLanguage: 'string',
  },
} as const satisfies ShapeNode

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function validateShape(value: unknown, shape: ShapeNode, path: string): void {
  if (typeof shape === 'string') {
    const valid = shape === 'string'
      ? typeof value === 'string'
      : shape === 'number'
        ? typeof value === 'number' && Number.isFinite(value)
        : shape === 'boolean'
          ? typeof value === 'boolean'
          : Array.isArray(value) && value.every(item => typeof item === 'string')
    if (!valid) throw new Error(`Invalid editor theme token at ${path}: expected ${shape}`)
    return
  }

  if (!isRecord(value)) throw new Error(`Invalid editor theme token branch at ${path}`)

  for (const key of Object.keys(shape)) {
    if (!hasOwn(value, key)) throw new Error(`Missing editor theme token at ${path}.${key}`)
  }
  for (const key of Object.keys(value)) {
    if (!hasOwn(shape, key)) throw new Error(`Unknown editor theme token at ${path}.${key}`)
  }
  for (const [key, childShape] of Object.entries(shape)) {
    validateShape(value[key], childShape, `${path}.${key}`)
  }
}

function validateThemeDefinition(value: unknown, index: number): asserts value is EditorThemeDefinition {
  const path = `catalog[${index}]`
  if (!isRecord(value)) throw new Error(`Invalid editor theme definition at ${path}`)
  const expectedKeys = ['schemaVersion', 'id', 'displayName', 'descriptionKey', 'shared', 'variants']
  for (const key of expectedKeys) {
    if (!hasOwn(value, key)) throw new Error(`Missing editor theme field at ${path}.${key}`)
  }
  for (const key of Object.keys(value)) {
    if (!expectedKeys.includes(key)) throw new Error(`Unknown editor theme field at ${path}.${key}`)
  }
  if (value.schemaVersion !== EDITOR_THEME_SCHEMA_VERSION) {
    throw new Error(`Invalid editor theme schemaVersion at ${path}`)
  }
  if (typeof value.id !== 'string' || !EDITOR_THEME_IDS.includes(value.id as EditorThemeId)) {
    throw new Error(`Invalid editor theme ID at ${path}`)
  }
  if (typeof value.displayName !== 'string' || value.displayName.length === 0) {
    throw new Error(`Invalid editor theme displayName at ${path}`)
  }
  if (typeof value.descriptionKey !== 'string' || value.descriptionKey.length === 0) {
    throw new Error(`Invalid editor theme descriptionKey at ${path}`)
  }
  validateShape(value.shared, SHARED_TOKEN_SHAPE, `${path}.shared`)
  if (!isRecord(value.variants)) throw new Error(`Invalid editor theme variants at ${path}`)
  const variants = value.variants
  if (!hasOwn(variants, 'light')) throw new Error(`Missing editor theme variant at ${path}.variants.light`)
  if (!hasOwn(variants, 'dark')) throw new Error(`Missing editor theme variant at ${path}.variants.dark`)
  for (const key of Object.keys(variants)) {
    if (key !== 'light' && key !== 'dark') throw new Error(`Unknown editor theme variant at ${path}.variants.${key}`)
  }
  validateShape(variants.light, VARIANT_TOKEN_SHAPE, `${path}.variants.light`)
  validateShape(variants.dark, VARIANT_TOKEN_SHAPE, `${path}.variants.dark`)
}

export function validateEditorThemeCatalog(input: unknown): EditorThemeCatalog {
  if (!Array.isArray(input)) throw new Error('Editor theme catalog must be an array')

  const seenIds = new Set<string>()
  for (let index = 0; index < input.length; index += 1) {
    validateThemeDefinition(input[index], index)
    if (seenIds.has(input[index].id)) throw new Error(`Found duplicate theme ID: ${input[index].id}`)
    seenIds.add(input[index].id)
  }
  if (input.length !== EDITOR_THEME_IDS.length) {
    throw new Error(`Editor theme catalog must contain exactly ${EDITOR_THEME_IDS.length} themes`)
  }
  for (const id of EDITOR_THEME_IDS) {
    if (!seenIds.has(id)) throw new Error(`Editor theme catalog is missing theme ID: ${id}`)
  }
  return input as EditorThemeCatalog
}

export function normalizeEditorThemeId(value: unknown): EditorThemeId {
  return typeof value === 'string' && EDITOR_THEME_IDS.includes(value as EditorThemeId)
    ? value as EditorThemeId
    : DEFAULT_EDITOR_THEME_ID
}

function camelToKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function isUnitlessThemeNumber(key: string, cssKey: string): boolean {
  return /weight|lineHeight|opacity/i.test(key)
    || cssKey.includes('line-height')
    || cssKey.includes('font-weight')
}

function serializeThemeValue(key: string, cssKey: string, value: string | number | boolean): string {
  if (typeof value === 'boolean') return String(value)
  if (typeof value !== 'number') return value
  if (isUnitlessThemeNumber(key, cssKey)) return String(value)
  return `${value}px`
}

function flattenValues(
  value: object,
  prefix: string,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, child] of Object.entries(value) as [string, unknown][]) {
    const cssKey = `${prefix}${camelToKebab(key)}`
    if (Array.isArray(child) || child === null || child === undefined) continue
    if (isRecord(child)) {
      Object.assign(result, flattenValues(child, `${cssKey}-`))
      continue
    }
    if (typeof child !== 'string' && typeof child !== 'number' && typeof child !== 'boolean') continue
    result[cssKey] = serializeThemeValue(key, cssKey, child)
  }
  return result
}

export function flattenEditorTheme(theme: EffectiveEditorTheme): Record<string, string> {
  const cssVars = flattenValues(theme.shared, '--')
  Object.assign(cssVars, flattenValues(theme.tokens, '--editor-theme-'))
  Object.assign(cssVars, flattenValues(theme.tokens.colors, '--colors-'))
  cssVars['--editor-code-block-background'] = theme.tokens.compatibility.editorCodeBlockBackground
  cssVars['--editor-code-block-border'] = theme.tokens.compatibility.editorCodeBlockBorder
  cssVars['--editor-code-block-text'] = theme.tokens.compatibility.editorCodeBlockText
  cssVars['--editor-code-block-language'] = theme.tokens.compatibility.editorCodeBlockLanguage
  return cssVars
}

export function resolveEffectiveEditorTheme(
  value: unknown,
  variant: EditorThemeVariant,
): EffectiveEditorTheme {
  const id = normalizeEditorThemeId(value)
  const definition = EDITOR_THEME_CATALOG.find(theme => theme.id === id)
  if (!definition) throw new Error(`Editor theme is missing from the catalog: ${id}`)
  return {
    ...definition,
    variant,
    tokens: definition.variants[variant],
  }
}

const TOLARIA_INTER_FONT_STACK = `'${EDITOR_THEME_FONT_FAMILIES.inter}', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', sans-serif`
const TOLARIA_SOURCE_SERIF_FONT_STACK = `'${EDITOR_THEME_FONT_FAMILIES.sourceSerif}', Georgia, 'Songti SC', 'Noto Serif CJK SC', serif`
const TOLARIA_JETBRAINS_FONT_STACK = `'${EDITOR_THEME_FONT_FAMILIES.jetBrainsMono}', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', 'Noto Sans Mono CJK SC', monospace`

const DEFAULT_SHARED_TOKENS: EditorThemeSharedTokens = {
  editor: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    headingFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 15,
    lineHeight: 1.5,
    maxWidth: 820,
    paddingHorizontal: 40,
    paddingVertical: 20,
    paragraphSpacing: 8,
    dividerFollowedByHeadingMarginTop: 8,
    rawFontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    rawFontSize: 13,
    rawLineHeight: 1.6,
    uiFontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    uiFontSize: 13,
    uiLineHeight: 1.4,
  },
  headings: {
    h1: { fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginTop: 32, marginBottom: 12, color: 'var(--editor-theme-text-heading)', letterSpacing: -0.5 },
    h2: { fontSize: 27, fontWeight: 600, lineHeight: 1.4, marginTop: 28, marginBottom: 10, color: 'var(--editor-theme-text-heading)', letterSpacing: -0.5 },
    h3: { fontSize: 20, fontWeight: 600, lineHeight: 1.4, marginTop: 24, marginBottom: 8, color: 'var(--editor-theme-text-heading)', letterSpacing: -0.5 },
    h4: { fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginTop: 20, marginBottom: 6, color: 'var(--editor-theme-text-heading)', letterSpacing: 0 },
  },
  lists: {
    bulletSymbol: '\u2022',
    bulletSize: 24,
    bulletColor: 'var(--editor-theme-accents-primary)',
    indentSize: 24,
    itemSpacing: 4,
    paddingLeft: 8,
    nestedBulletSymbols: ['\u2022', '\u25e6', '\u25aa'],
    bulletGap: 6,
  },
  checkboxes: {
    size: 18,
    borderRadius: 3,
    checkedColor: 'var(--editor-theme-accents-primary)',
    uncheckedBorderColor: 'var(--editor-theme-text-muted)',
    gap: 8,
  },
  inlineStyles: {
    bold: { fontWeight: 700, color: 'var(--editor-theme-text-primary)' },
    italic: { fontStyle: 'italic', color: 'var(--editor-theme-text-primary)' },
    strikethrough: { color: 'var(--editor-theme-text-secondary)', textDecoration: 'line-through' },
    code: {
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 14,
      backgroundColor: 'var(--editor-theme-surfaces-inline-code)',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      color: 'var(--editor-theme-text-code)',
    },
    link: { color: 'var(--editor-theme-text-link)', textDecoration: 'underline' },
    wikilink: { color: 'var(--editor-theme-text-wikilink)', textDecoration: 'none', borderBottom: '1px dotted currentColor', cursor: 'pointer' },
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: 'var(--editor-theme-accents-primary)',
    paddingLeft: 16,
    marginVertical: 12,
    color: 'var(--editor-theme-text-secondary)',
    fontStyle: 'italic',
  },
  table: {
    borderColor: 'var(--editor-theme-borders-default)',
    headerBackground: 'var(--editor-theme-surfaces-table-header)',
    cellPaddingHorizontal: 12,
    cellPaddingVertical: 8,
    fontSize: 14,
  },
  horizontalRule: {
    color: 'var(--editor-theme-borders-divider)',
    marginVertical: 24,
    thickness: 1,
  },
}

function createSharedTokens(overrides: {
  editor?: Partial<EditorThemeSharedTokens['editor']>
  codeFontFamily?: string
  codeFontSize?: number
} = {}): EditorThemeSharedTokens {
  return {
    ...DEFAULT_SHARED_TOKENS,
    editor: { ...DEFAULT_SHARED_TOKENS.editor, ...overrides.editor },
    inlineStyles: {
      ...DEFAULT_SHARED_TOKENS.inlineStyles,
      code: {
        ...DEFAULT_SHARED_TOKENS.inlineStyles.code,
        ...(overrides.codeFontFamily !== undefined ? { fontFamily: overrides.codeFontFamily } : {}),
        ...(overrides.codeFontSize !== undefined ? { fontSize: overrides.codeFontSize } : {}),
      },
    },
  }
}

type VariantOverrides = {
  [K in keyof EditorThemeVariantTokens]?: Partial<EditorThemeVariantTokens[K]>
}

function createVariant(
  base: EditorThemeVariantTokens,
  overrides: VariantOverrides = {},
): EditorThemeVariantTokens {
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    surfaces: { ...base.surfaces, ...overrides.surfaces },
    text: { ...base.text, ...overrides.text },
    borders: { ...base.borders, ...overrides.borders },
    accents: {
      ...base.accents,
      ...overrides.accents,
      highlights: { ...base.accents.highlights, ...overrides.accents?.highlights },
    },
    feedback: { ...base.feedback, ...overrides.feedback },
    syntax: { ...base.syntax, ...overrides.syntax },
    mermaid: { ...base.mermaid, ...overrides.mermaid },
    embeddedControls: { ...base.embeddedControls, ...overrides.embeddedControls },
    behavior: { ...base.behavior, ...overrides.behavior },
    compatibility: { ...base.compatibility, ...overrides.compatibility },
  }
}

const DEFAULT_LIGHT_VARIANT: EditorThemeVariantTokens = {
  colors: {
    background: '#FFFFFF', text: '#37352F', textSecondary: '#5F5D58', textMuted: '#595752',
    heading: '#37352F', accent: '#155DFF', selection: '#DDEBFF', cursor: '#37352F',
  },
  surfaces: {
    canvas: '#FFFFFF', code: '#F7F6F3', inlineCode: '#F0F0EF', tableHeader: '#FFFFFF',
    quote: '#FFFFFF', callout: '#FFFFFF', selection: '#DDEBFF', activeLine: '#F0F0EF', gutter: '#FFFFFF',
  },
  text: {
    primary: '#37352F', secondary: '#5F5D58', muted: '#595752', heading: '#37352F', inverse: '#FFFFFF',
    error: '#B42318', code: '#37352F', link: '#155DFF', wikilink: '#155DFF',
  },
  borders: {
    default: '#E9E9E7', subtle: '#E9E9E7', strong: '#D9D9D6', code: '#D9D9D6',
    divider: '#E9E9E7', gutter: '#D9D9D6', focus: '#155DFF',
  },
  accents: {
    primary: '#155DFF', primaryHover: '#0D4AD6',
    highlights: { red: '#B42318', green: '#16794A', blue: '#155DFF', purple: '#6B46C1' },
  },
  feedback: {
    info: { text: '#075985', background: '#E0F2FE', border: '#0EA5E9' },
    success: { text: '#166534', background: '#DCFCE7', border: '#16A34A' },
    warning: { text: '#92400E', background: '#FEF3C7', border: '#D97706' },
    error: { text: '#991B1B', background: '#FEE2E2', border: '#DC2626' },
    note: { text: '#075985', background: '#E0F2FE', border: '#0EA5E9' },
    example: { text: '#6B21A8', background: '#F3E8FF', border: '#9333EA' },
    quote: { text: '#374151', background: '#F3F4F6', border: '#9CA3AF' },
  },
  syntax: {
    foreground: '#37352F', mutedPunctuation: '#5F5D58', comment: '#5B6470', keyword: '#B42318',
    string: '#075985', number: '#1D4ED8', typeClass: '#9A3412', function: '#155DFF',
    variableProperty: '#0F766E', operator: '#7C2D12', tagAttribute: '#9A3412', invalidError: '#B42318',
    selection: '#DDEBFF', activeLine: '#F0F0EF', codeSurface: '#F7F6F3', codeBorder: '#D9D9D6',
  },
  mermaid: {
    background: '#FFFFFF', text: '#37352F', nodeBackground: '#FFFFFF', nodeBorder: '#5F5D58',
    edge: '#155DFF', cluster: '#E8F4FE', accent: '#155DFF',
  },
  embeddedControls: {
    background: '#EBEBEA', text: '#37352F', border: '#D9D9D6', hoverBackground: '#E0E0DE',
  },
  behavior: { showRichCodeBlockLineNumbers: false },
  compatibility: {
    editorCodeBlockBackground: '#F7F6F3', editorCodeBlockBorder: '#E9E9E7',
    editorCodeBlockText: '#37352F', editorCodeBlockLanguage: '#787774',
  },
}

const DEFAULT_DARK_VARIANT: EditorThemeVariantTokens = {
  colors: {
    background: '#1F1E1B', text: '#E6E1D8', textSecondary: '#B8B1A6', textMuted: '#A69E92',
    heading: '#F1ECE3', accent: '#8AB4FF', selection: '#2B4A6D', cursor: '#E6E1D8',
  },
  surfaces: {
    canvas: '#1F1E1B', code: '#161616', inlineCode: '#2D2B27', tableHeader: '#292823',
    quote: '#23221F', callout: '#23221F', selection: '#2B4A6D', activeLine: '#262520', gutter: '#1F1E1B',
  },
  text: {
    primary: '#E6E1D8', secondary: '#B8B1A6', muted: '#A69E92', heading: '#F1ECE3', inverse: '#151411',
    error: '#FF9B96', code: '#F7F2EA', link: '#8AB4FF', wikilink: '#8AB4FF',
  },
  borders: {
    default: '#34322D', subtle: '#2A2925', strong: '#46433B', code: '#4A4740',
    divider: '#34322D', gutter: '#46433B', focus: '#8AB4FF',
  },
  accents: {
    primary: '#8AB4FF', primaryHover: '#B0CCFF',
    highlights: { red: '#FF9B96', green: '#8FE3AE', blue: '#8AB4FF', purple: '#C5B5FF' },
  },
  feedback: {
    info: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' },
    success: { text: '#BBF7D0', background: '#163B2A', border: '#5CCB86' },
    warning: { text: '#FDE68A', background: '#4A3211', border: '#E0A93B' },
    error: { text: '#FECACA', background: '#4A1C1C', border: '#F07878' },
    note: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' },
    example: { text: '#E9D5FF', background: '#3A2550', border: '#BE8FFF' },
    quote: { text: '#E5E7EB', background: '#303238', border: '#8C93A1' },
  },
  syntax: {
    foreground: '#E6E1D8', mutedPunctuation: '#B8B1A6', comment: '#B7B0A7', keyword: '#FF9B9B',
    string: '#A9D6FF', number: '#AFC5FF', typeClass: '#F3B175', function: '#8AB4FF',
    variableProperty: '#86D8C5', operator: '#F2C879', tagAttribute: '#F3B175', invalidError: '#FFAAA8',
    selection: '#2B4A6D', activeLine: '#262520', codeSurface: '#161616', codeBorder: '#4A4740',
  },
  mermaid: {
    background: '#1F1E1B', text: '#E6E1D8', nodeBackground: '#292823', nodeBorder: '#B8B1A6',
    edge: '#8AB4FF', cluster: '#262520', accent: '#8AB4FF',
  },
  embeddedControls: {
    background: '#34322D', text: '#E6E1D8', border: '#46433B', hoverBackground: '#403E37',
  },
  behavior: { showRichCodeBlockLineNumbers: false },
  compatibility: {
    editorCodeBlockBackground: '#161616', editorCodeBlockBorder: 'transparent',
    editorCodeBlockText: '#FFFFFF', editorCodeBlockLanguage: 'rgba(255, 255, 255, 0.7)',
  },
}

/*
 * Non-default families are materialized from complete role palettes at module load.
 * This is declaration-time reuse only; the validator receives and checks every emitted field,
 * so runtime resolution never fills a missing official token from another family.
 */
const CODE_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { background: '#F6F8FB', text: '#1F2937', textSecondary: '#4B5563', textMuted: '#52606D', heading: '#111827', accent: '#1D4ED8', selection: '#DCEBFF', cursor: '#1F2937' },
  surfaces: { canvas: '#F6F8FB', code: '#F0F4F8', inlineCode: '#E6EEF8', tableHeader: '#EDF2F7', quote: '#F8FAFC', callout: '#F8FAFC', selection: '#DCEBFF', activeLine: '#EAF0F6', gutter: '#F6F8FB' },
  text: { primary: '#1F2937', secondary: '#4B5563', muted: '#52606D', heading: '#111827', inverse: '#FFFFFF', error: '#B42318', code: '#1F2937', link: '#1D4ED8', wikilink: '#1D4ED8' },
  borders: { default: '#CBD5E1', subtle: '#D7E0EA', strong: '#94A3B8', code: '#C5D0DD', divider: '#CBD5E1', gutter: '#C5D0DD', focus: '#1D4ED8' },
  accents: { primary: '#1D4ED8', primaryHover: '#1E40AF', highlights: { red: '#B42318', green: '#166534', blue: '#1D4ED8', purple: '#6D28D9' } },
  feedback: {
    info: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, success: { text: '#166534', background: '#DCFCE7', border: '#16A34A' }, warning: { text: '#92400E', background: '#FEF3C7', border: '#D97706' }, error: { text: '#991B1B', background: '#FEE2E2', border: '#DC2626' }, note: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, example: { text: '#6B21A8', background: '#F3E8FF', border: '#9333EA' }, quote: { text: '#374151', background: '#F3F4F6', border: '#9CA3AF' },
  },
  syntax: { foreground: '#1F2937', mutedPunctuation: '#52606D', comment: '#52606D', keyword: '#B42318', string: '#0E7490', number: '#1D4ED8', typeClass: '#9A3412', function: '#1D4ED8', variableProperty: '#0F766E', operator: '#92400E', tagAttribute: '#9A3412', invalidError: '#B42318', selection: '#DCEBFF', activeLine: '#EAF0F6', codeSurface: '#F0F4F8', codeBorder: '#C5D0DD' },
  mermaid: { background: '#F6F8FB', text: '#1F2937', nodeBackground: '#FFFFFF', nodeBorder: '#4B5563', edge: '#1D4ED8', cluster: '#E6EEF8', accent: '#1D4ED8' },
  embeddedControls: { background: '#E7EDF4', text: '#1F2937', border: '#C5D0DD', hoverBackground: '#DCE5EF' },
  behavior: { showRichCodeBlockLineNumbers: true },
  compatibility: { editorCodeBlockBackground: '#F0F4F8', editorCodeBlockBorder: '#C5D0DD', editorCodeBlockText: '#1F2937', editorCodeBlockLanguage: '#4B5563' },
})
const CODE_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { background: '#111827', text: '#E5EEF9', textSecondary: '#B7C7DB', textMuted: '#A8B6C8', heading: '#F8FAFC', accent: '#8AB4FF', selection: '#203A5F', cursor: '#E5EEF9' },
  surfaces: { canvas: '#111827', code: '#162033', inlineCode: '#22314A', tableHeader: '#1C2A40', quote: '#172235', callout: '#172235', selection: '#203A5F', activeLine: '#18263A', gutter: '#111827' },
  text: { primary: '#E5EEF9', secondary: '#B7C7DB', muted: '#A8B6C8', heading: '#F8FAFC', inverse: '#0F172A', error: '#FFAAA8', code: '#E5EEF9', link: '#8AB4FF', wikilink: '#8AB4FF' },
  borders: { default: '#334155', subtle: '#293A50', strong: '#52657E', code: '#455A75', divider: '#334155', gutter: '#455A75', focus: '#8AB4FF' },
  accents: { primary: '#8AB4FF', primaryHover: '#B0CCFF', highlights: { red: '#FFAAA8', green: '#8FE3AE', blue: '#8AB4FF', purple: '#C5B5FF' } },
  feedback: {
    info: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, success: { text: '#BBF7D0', background: '#163B2A', border: '#5CCB86' }, warning: { text: '#FDE68A', background: '#4A3211', border: '#E0A93B' }, error: { text: '#FECACA', background: '#4A1C1C', border: '#F07878' }, note: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, example: { text: '#E9D5FF', background: '#3A2550', border: '#BE8FFF' }, quote: { text: '#E5E7EB', background: '#303238', border: '#8C93A1' },
  },
  syntax: { foreground: '#E5EEF9', mutedPunctuation: '#B7C7DB', comment: '#A8B8CC', keyword: '#FF9B9B', string: '#9ED6FF', number: '#B6C7FF', typeClass: '#F6B26B', function: '#8AB4FF', variableProperty: '#7ED6C5', operator: '#F2C879', tagAttribute: '#F6B26B', invalidError: '#FFAAA8', selection: '#203A5F', activeLine: '#18263A', codeSurface: '#162033', codeBorder: '#455A75' },
  mermaid: { background: '#111827', text: '#E5EEF9', nodeBackground: '#1C2A40', nodeBorder: '#B7C7DB', edge: '#8AB4FF', cluster: '#18263A', accent: '#8AB4FF' },
  embeddedControls: { background: '#25344B', text: '#E5EEF9', border: '#52657E', hoverBackground: '#30445E' },
  behavior: { showRichCodeBlockLineNumbers: true },
  compatibility: { editorCodeBlockBackground: '#162033', editorCodeBlockBorder: '#455A75', editorCodeBlockText: '#E5EEF9', editorCodeBlockLanguage: '#B7C7DB' },
})

const EDITORIAL_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { background: '#FCF9F5', text: '#302B2B', textSecondary: '#5B5552', textMuted: '#625B57', heading: '#2B2525', accent: '#8F3D52', selection: '#F2DDE2', cursor: '#302B2B' },
  surfaces: { canvas: '#FCF9F5', code: '#F3EBE5', inlineCode: '#EEE2DC', tableHeader: '#F3EBE4', quote: '#F7F0EA', callout: '#F7F0EA', selection: '#F2DDE2', activeLine: '#F8F1EC', gutter: '#FCF9F5' },
  text: { primary: '#302B2B', secondary: '#5B5552', muted: '#625B57', heading: '#2B2525', inverse: '#FFFFFF', error: '#9F1239', code: '#423839', link: '#7D3045', wikilink: '#7D3045' },
  borders: { default: '#D7C9C0', subtle: '#E3D8D1', strong: '#B9A79D', code: '#D5C5BC', divider: '#D7C9C0', gutter: '#D5C5BC', focus: '#8F3D52' },
  accents: { primary: '#8F3D52', primaryHover: '#742F41', highlights: { red: '#9F1239', green: '#166534', blue: '#155DFF', purple: '#6B21A8' } },
  feedback: {
    info: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, success: { text: '#166534', background: '#DCFCE7', border: '#16A34A' }, warning: { text: '#92400E', background: '#FEF3C7', border: '#D97706' }, error: { text: '#991B1B', background: '#FEE2E2', border: '#DC2626' }, note: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, example: { text: '#6B21A8', background: '#F3E8FF', border: '#9333EA' }, quote: { text: '#374151', background: '#F3F4F6', border: '#9CA3AF' },
  },
  syntax: { foreground: '#302B2B', mutedPunctuation: '#5B5552', comment: '#625B57', keyword: '#9F1239', string: '#075985', number: '#1D4ED8', typeClass: '#9A3412', function: '#7D3045', variableProperty: '#0F766E', operator: '#7C2D12', tagAttribute: '#9A3412', invalidError: '#9F1239', selection: '#F2DDE2', activeLine: '#F8F1EC', codeSurface: '#F3EBE5', codeBorder: '#D5C5BC' },
  mermaid: { background: '#FCF9F5', text: '#302B2B', nodeBackground: '#F7F0EA', nodeBorder: '#5B5552', edge: '#8F3D52', cluster: '#F8F1EC', accent: '#8F3D52' },
  embeddedControls: { background: '#EFE5DE', text: '#302B2B', border: '#D5C5BC', hoverBackground: '#E5D8D0' },
  compatibility: { editorCodeBlockBackground: '#F3EBE5', editorCodeBlockBorder: '#D5C5BC', editorCodeBlockText: '#423839', editorCodeBlockLanguage: '#5B5552' },
})
const EDITORIAL_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { background: '#211D1B', text: '#F1E5DF', textSecondary: '#D3BFB7', textMuted: '#C6B0A8', heading: '#FFF6F1', accent: '#E39AAA', selection: '#5A303B', cursor: '#F1E5DF' },
  surfaces: { canvas: '#211D1B', code: '#2A2221', inlineCode: '#382A2A', tableHeader: '#302625', quote: '#2A2221', callout: '#2A2221', selection: '#5A303B', activeLine: '#2A2220', gutter: '#211D1B' },
  text: { primary: '#F1E5DF', secondary: '#D3BFB7', muted: '#C6B0A8', heading: '#FFF6F1', inverse: '#211D1B', error: '#FFB4AB', code: '#F1DDD5', link: '#F2A7B8', wikilink: '#F2A7B8' },
  borders: { default: '#4A3937', subtle: '#3D302F', strong: '#6A504D', code: '#624946', divider: '#4A3937', gutter: '#624946', focus: '#F2A7B8' },
  accents: { primary: '#E39AAA', primaryHover: '#F2B8C5', highlights: { red: '#FFB4AB', green: '#8FE3AE', blue: '#9CC4FF', purple: '#D5B9FF' } },
  feedback: {
    info: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, success: { text: '#BBF7D0', background: '#163B2A', border: '#5CCB86' }, warning: { text: '#FDE68A', background: '#4A3211', border: '#E0A93B' }, error: { text: '#FECACA', background: '#4A1C1C', border: '#F07878' }, note: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, example: { text: '#E9D5FF', background: '#3A2550', border: '#BE8FFF' }, quote: { text: '#E5E7EB', background: '#303238', border: '#8C93A1' },
  },
  syntax: { foreground: '#F1E5DF', mutedPunctuation: '#D3BFB7', comment: '#C6B0A8', keyword: '#FFB4B7', string: '#A9D6FF', number: '#B6C7FF', typeClass: '#F6B26B', function: '#F2A7B8', variableProperty: '#86D8C5', operator: '#F2C879', tagAttribute: '#F6B26B', invalidError: '#FFB4AB', selection: '#5A303B', activeLine: '#2A2220', codeSurface: '#2A2221', codeBorder: '#624946' },
  mermaid: { background: '#211D1B', text: '#F1E5DF', nodeBackground: '#302625', nodeBorder: '#D3BFB7', edge: '#F2A7B8', cluster: '#2A2220', accent: '#E39AAA' },
  embeddedControls: { background: '#4A3937', text: '#F1E5DF', border: '#6A504D', hoverBackground: '#594442' },
  compatibility: { editorCodeBlockBackground: '#2A2221', editorCodeBlockBorder: '#624946', editorCodeBlockText: '#F1DDD5', editorCodeBlockLanguage: '#D3BFB7' },
})

const CANVAS_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { background: '#F7F9FC', text: '#263449', textSecondary: '#536176', textMuted: '#5D6A7D', heading: '#172033', accent: '#4F46B8', selection: '#E5E7FF', cursor: '#263449' },
  surfaces: { canvas: '#F7F9FC', code: '#EEF2F7', inlineCode: '#E8EDF6', tableHeader: '#EFF3F9', quote: '#F3F6FB', callout: '#F3F6FB', selection: '#E5E7FF', activeLine: '#EEF2F7', gutter: '#F7F9FC' },
  text: { primary: '#263449', secondary: '#536176', muted: '#5D6A7D', heading: '#172033', inverse: '#FFFFFF', error: '#B42318', code: '#263449', link: '#4338A3', wikilink: '#4338A3' },
  borders: { default: '#D1D9E6', subtle: '#DEE5EF', strong: '#A7B5C8', code: '#C9D3E1', divider: '#D1D9E6', gutter: '#C9D3E1', focus: '#4F46B8' },
  accents: { primary: '#4F46B8', primaryHover: '#4338A3', highlights: { red: '#B42318', green: '#166534', blue: '#1D4ED8', purple: '#6D28D9' } },
  feedback: {
    info: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, success: { text: '#166534', background: '#DCFCE7', border: '#16A34A' }, warning: { text: '#92400E', background: '#FEF3C7', border: '#D97706' }, error: { text: '#991B1B', background: '#FEE2E2', border: '#DC2626' }, note: { text: '#075985', background: '#E0F2FE', border: '#0284C7' }, example: { text: '#6B21A8', background: '#F3E8FF', border: '#9333EA' }, quote: { text: '#374151', background: '#F3F4F6', border: '#9CA3AF' },
  },
  syntax: { foreground: '#263449', mutedPunctuation: '#536176', comment: '#5D6A7D', keyword: '#B42318', string: '#0E7490', number: '#4338A3', typeClass: '#9A3412', function: '#4338A3', variableProperty: '#0F766E', operator: '#92400E', tagAttribute: '#9A3412', invalidError: '#B42318', selection: '#E5E7FF', activeLine: '#EEF2F7', codeSurface: '#EEF2F7', codeBorder: '#C9D3E1' },
  mermaid: { background: '#F7F9FC', text: '#263449', nodeBackground: '#EFF3F9', nodeBorder: '#536176', edge: '#4F46B8', cluster: '#EEF2F7', accent: '#4F46B8' },
  embeddedControls: { background: '#E9EDF5', text: '#263449', border: '#C9D3E1', hoverBackground: '#DDE4F0' },
  compatibility: { editorCodeBlockBackground: '#EEF2F7', editorCodeBlockBorder: '#C9D3E1', editorCodeBlockText: '#263449', editorCodeBlockLanguage: '#536176' },
})
const CANVAS_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { background: '#202225', text: '#F1F3FF', textSecondary: '#CCD1E1', textMuted: '#B8BED1', heading: '#FFFFFF', accent: '#A8A4FF', selection: '#413C70', cursor: '#F1F3FF' },
  surfaces: { canvas: '#202225', code: '#292C35', inlineCode: '#343744', tableHeader: '#2C303A', quote: '#282B33', callout: '#282B33', selection: '#413C70', activeLine: '#292C35', gutter: '#202225' },
  text: { primary: '#F1F3FF', secondary: '#CCD1E1', muted: '#B8BED1', heading: '#FFFFFF', inverse: '#202225', error: '#FFAAA8', code: '#F1F3FF', link: '#A8A4FF', wikilink: '#A8A4FF' },
  borders: { default: '#3F4350', subtle: '#353945', strong: '#5C6273', code: '#505666', divider: '#3F4350', gutter: '#505666', focus: '#A8A4FF' },
  accents: { primary: '#A8A4FF', primaryHover: '#C1BEFF', highlights: { red: '#FFAAA8', green: '#8FE3AE', blue: '#A8C4FF', purple: '#D0C5FF' } },
  feedback: {
    info: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, success: { text: '#BBF7D0', background: '#163B2A', border: '#5CCB86' }, warning: { text: '#FDE68A', background: '#4A3211', border: '#E0A93B' }, error: { text: '#FECACA', background: '#4A1C1C', border: '#F07878' }, note: { text: '#BAE6FD', background: '#14344D', border: '#5BA9D6' }, example: { text: '#E9D5FF', background: '#3A2550', border: '#BE8FFF' }, quote: { text: '#E5E7EB', background: '#303238', border: '#8C93A1' },
  },
  syntax: { foreground: '#F1F3FF', mutedPunctuation: '#CCD1E1', comment: '#B8BED1', keyword: '#FFB4B7', string: '#A9D6FF', number: '#BFC8FF', typeClass: '#F6B26B', function: '#A8A4FF', variableProperty: '#86D8C5', operator: '#F2C879', tagAttribute: '#F6B26B', invalidError: '#FFAAA8', selection: '#413C70', activeLine: '#292C35', codeSurface: '#292C35', codeBorder: '#505666' },
  mermaid: { background: '#202225', text: '#F1F3FF', nodeBackground: '#2C303A', nodeBorder: '#CCD1E1', edge: '#A8A4FF', cluster: '#292C35', accent: '#A8A4FF' },
  embeddedControls: { background: '#3F4350', text: '#F1F3FF', border: '#5C6273', hoverBackground: '#4A4F5E' },
  compatibility: { editorCodeBlockBackground: '#292C35', editorCodeBlockBorder: '#505666', editorCodeBlockText: '#F1F3FF', editorCodeBlockLanguage: '#CCD1E1' },
})

const RAW_EDITOR_THEME_CATALOG = [
  {
    schemaVersion: EDITOR_THEME_SCHEMA_VERSION,
    id: 'default',
    displayName: 'Default',
    descriptionKey: 'editorTheme.default.description',
    shared: createSharedTokens(),
    variants: { light: DEFAULT_LIGHT_VARIANT, dark: DEFAULT_DARK_VARIANT },
  },
  {
    schemaVersion: EDITOR_THEME_SCHEMA_VERSION,
    id: 'code',
    displayName: 'Code',
    descriptionKey: 'editorTheme.code.description',
    shared: createSharedTokens({
      editor: {
        fontFamily: TOLARIA_INTER_FONT_STACK,
        headingFontFamily: TOLARIA_INTER_FONT_STACK,
        rawFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
        uiFontFamily: TOLARIA_INTER_FONT_STACK,
        fontSize: 14,
        lineHeight: 1.45,
        maxWidth: 900,
        paddingHorizontal: 32,
        paragraphSpacing: 6,
      },
      codeFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
      codeFontSize: 13,
    }),
    variants: { light: CODE_LIGHT_VARIANT, dark: CODE_DARK_VARIANT },
  },
  {
    schemaVersion: EDITOR_THEME_SCHEMA_VERSION,
    id: 'editorial',
    displayName: 'Editorial',
    descriptionKey: 'editorTheme.editorial.description',
    shared: createSharedTokens({
      editor: {
        fontFamily: TOLARIA_SOURCE_SERIF_FONT_STACK,
        headingFontFamily: TOLARIA_INTER_FONT_STACK,
        rawFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
        uiFontFamily: TOLARIA_INTER_FONT_STACK,
        fontSize: 16,
        lineHeight: 1.65,
        maxWidth: 720,
        paddingHorizontal: 32,
        paragraphSpacing: 12,
      },
      codeFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
    }),
    variants: { light: EDITORIAL_LIGHT_VARIANT, dark: EDITORIAL_DARK_VARIANT },
  },
  {
    schemaVersion: EDITOR_THEME_SCHEMA_VERSION,
    id: 'canvas',
    displayName: 'Canvas',
    descriptionKey: 'editorTheme.canvas.description',
    shared: createSharedTokens({
      editor: {
        fontFamily: TOLARIA_INTER_FONT_STACK,
        headingFontFamily: TOLARIA_INTER_FONT_STACK,
        rawFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
        uiFontFamily: TOLARIA_INTER_FONT_STACK,
        fontSize: 15,
        lineHeight: 1.55,
        maxWidth: 1040,
        paddingHorizontal: 48,
        paddingVertical: 28,
        paragraphSpacing: 10,
      },
      codeFontFamily: TOLARIA_JETBRAINS_FONT_STACK,
    }),
    variants: { light: CANVAS_LIGHT_VARIANT, dark: CANVAS_DARK_VARIANT },
  },
] satisfies readonly EditorThemeDefinition[]

export const EDITOR_THEME_CATALOG: EditorThemeCatalog = validateEditorThemeCatalog(RAW_EDITOR_THEME_CATALOG)
