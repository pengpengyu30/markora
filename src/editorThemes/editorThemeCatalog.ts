export const EDITOR_THEME_SCHEMA_VERSION = 1 as const

export const EDITOR_THEME_IDS = ['default', 'code', 'editorial', 'canvas'] as const
export type EditorThemeId = typeof EDITOR_THEME_IDS[number]

export const DEFAULT_EDITOR_THEME_ID = 'default' as const
export const SELECTABLE_EDITOR_THEME_IDS = [DEFAULT_EDITOR_THEME_ID] as const

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

const DEFAULT_SHARED_TOKENS: EditorThemeSharedTokens = {
  editor: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
    h1: { fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginTop: 32, marginBottom: 12, color: 'var(--text-heading)', letterSpacing: -0.5 },
    h2: { fontSize: 27, fontWeight: 600, lineHeight: 1.4, marginTop: 28, marginBottom: 10, color: 'var(--text-heading)', letterSpacing: -0.5 },
    h3: { fontSize: 20, fontWeight: 600, lineHeight: 1.4, marginTop: 24, marginBottom: 8, color: 'var(--text-heading)', letterSpacing: -0.5 },
    h4: { fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginTop: 20, marginBottom: 6, color: 'var(--text-heading)', letterSpacing: 0 },
  },
  lists: {
    bulletSymbol: '\u2022',
    bulletSize: 24,
    bulletColor: 'var(--accent-blue)',
    indentSize: 24,
    itemSpacing: 4,
    paddingLeft: 8,
    nestedBulletSymbols: ['\u2022', '\u25e6', '\u25aa'],
    bulletGap: 6,
  },
  checkboxes: {
    size: 18,
    borderRadius: 3,
    checkedColor: 'var(--accent-blue)',
    uncheckedBorderColor: 'var(--text-muted)',
    gap: 8,
  },
  inlineStyles: {
    bold: { fontWeight: 700, color: 'var(--text-primary)' },
    italic: { fontStyle: 'italic', color: 'var(--text-primary)' },
    strikethrough: { color: 'var(--text-tertiary)', textDecoration: 'line-through' },
    code: {
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      fontSize: 14,
      backgroundColor: 'var(--bg-hover-subtle)',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 3,
      color: 'var(--text-secondary)',
    },
    link: { color: 'var(--accent-blue)', textDecoration: 'underline' },
    wikilink: { color: 'var(--accent-blue)', textDecoration: 'none', borderBottom: '1px dotted currentColor', cursor: 'pointer' },
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: 'var(--accent-blue)',
    paddingLeft: 16,
    marginVertical: 12,
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  table: {
    borderColor: 'var(--border-primary)',
    headerBackground: 'var(--bg-card)',
    cellPaddingHorizontal: 12,
    cellPaddingVertical: 8,
    fontSize: 14,
  },
  horizontalRule: {
    color: 'var(--border-primary)',
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
    background: 'var(--bg-primary)', text: 'var(--text-primary)', textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)', heading: 'var(--text-heading)', accent: 'var(--accent-blue)',
    selection: 'var(--bg-selected)', cursor: 'var(--text-primary)',
  },
  surfaces: {
    canvas: 'var(--surface-editor)', code: 'var(--surface-sidebar)', inlineCode: 'var(--bg-hover-subtle)',
    tableHeader: 'var(--bg-card)', quote: 'var(--surface-card)', callout: 'var(--surface-card)',
    selection: 'var(--bg-selected)', activeLine: 'var(--state-hover-subtle)', gutter: 'var(--surface-editor)',
  },
  text: {
    primary: 'var(--text-primary)', secondary: 'var(--text-secondary)', muted: 'var(--text-muted)',
    heading: 'var(--text-heading)', inverse: 'var(--text-inverse)', error: 'var(--accent-red)',
    code: 'var(--text-primary)', link: 'var(--accent-blue)', wikilink: 'var(--accent-blue)',
  },
  borders: {
    default: 'var(--border-default)', subtle: 'var(--border-subtle)', strong: 'var(--border-strong)',
    code: 'var(--border-subtle)', divider: 'var(--border-primary)', gutter: 'var(--border-subtle)', focus: 'var(--border-focus)',
  },
  accents: {
    primary: 'var(--accent-blue)', primaryHover: 'var(--accent-blue-hover)',
    highlights: { red: 'var(--accent-red)', green: 'var(--accent-green)', blue: 'var(--accent-blue)', purple: 'var(--accent-purple)' },
  },
  feedback: {
    info: { text: 'var(--feedback-info-text)', background: 'var(--feedback-info-bg)', border: 'var(--accent-blue)' },
    success: { text: 'var(--feedback-success-text)', background: 'var(--feedback-success-bg)', border: 'var(--accent-green)' },
    warning: { text: 'var(--feedback-warning-text)', background: 'var(--feedback-warning-bg)', border: 'var(--feedback-warning-border)' },
    error: { text: 'var(--feedback-error-text)', background: 'var(--feedback-error-bg)', border: 'var(--accent-red)' },
    note: { text: 'var(--feedback-info-text)', background: 'var(--feedback-info-bg)', border: 'var(--accent-blue)' },
    example: { text: 'var(--accent-purple)', background: 'var(--accent-purple-light)', border: 'var(--accent-purple)' },
    quote: { text: 'var(--text-secondary)', background: 'var(--surface-card)', border: 'var(--border-subtle)' },
  },
  syntax: {
    foreground: 'var(--text-primary)', mutedPunctuation: 'var(--syntax-muted)', comment: 'var(--syntax-highlight-comment)',
    keyword: 'var(--syntax-highlight-keyword)', string: 'var(--syntax-highlight-string)', number: 'var(--syntax-highlight-number)',
    typeClass: 'var(--syntax-highlight-type)', function: 'var(--syntax-highlight-title)', variableProperty: 'var(--syntax-highlight-title)',
    operator: 'var(--syntax-highlight-keyword)', tagAttribute: 'var(--syntax-highlight-type)', invalidError: 'var(--syntax-highlight-deletion)',
    selection: 'var(--bg-selected)', activeLine: 'var(--state-hover-subtle)', codeSurface: 'var(--surface-sidebar)', codeBorder: 'var(--border-subtle)',
  },
  mermaid: {
    background: 'var(--surface-editor)', text: 'var(--text-primary)', nodeBackground: 'var(--bg-card)',
    nodeBorder: 'var(--border-primary)', edge: 'var(--accent-blue)', cluster: 'var(--state-hover-subtle)', accent: 'var(--accent-blue)',
  },
  embeddedControls: {
    background: 'var(--surface-button)', text: 'var(--text-primary)', border: 'var(--border-default)', hoverBackground: 'var(--state-hover)',
  },
  behavior: { showRichCodeBlockLineNumbers: false },
  compatibility: {
    editorCodeBlockBackground: 'var(--surface-sidebar)',
    editorCodeBlockBorder: 'var(--border-subtle)',
    editorCodeBlockText: 'var(--text-primary)',
    editorCodeBlockLanguage: 'var(--text-secondary)',
  },
}

/*
 * Non-default families are materialized from these complete role palettes at module load.
 * This is declaration-time reuse only; the validator receives and checks every emitted field,
 * so runtime resolution never fills a missing official token from another family.
 */
const DEFAULT_DARK_VARIANT: EditorThemeVariantTokens = createVariant(DEFAULT_LIGHT_VARIANT, {
  surfaces: { canvas: 'var(--surface-editor)', code: '#161616', gutter: 'var(--surface-editor)' },
  borders: { code: 'transparent', gutter: 'var(--border-subtle)' },
  syntax: { codeSurface: '#161616', codeBorder: 'transparent' },
  compatibility: {
    editorCodeBlockBackground: '#161616',
    editorCodeBlockBorder: 'transparent',
    editorCodeBlockText: '#FFFFFF',
    editorCodeBlockLanguage: 'rgba(255, 255, 255, 0.7)',
  },
})

const CODE_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { accent: '#2563EB' },
  surfaces: { code: '#F3F6FA', inlineCode: '#E9EFF8', tableHeader: '#EEF3F8' },
  accents: { primary: '#2563EB', primaryHover: '#1D4ED8' },
  behavior: { showRichCodeBlockLineNumbers: true },
})
const CODE_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { accent: '#7DB1FF' },
  surfaces: { code: '#172235', inlineCode: '#22324A', tableHeader: '#202E43' },
  accents: { primary: '#7DB1FF', primaryHover: '#A6C8FF' },
  behavior: { showRichCodeBlockLineNumbers: true },
  compatibility: { editorCodeBlockBackground: '#172235', editorCodeBlockText: '#F4F8FF', editorCodeBlockLanguage: '#B9D5FF' },
})

const EDITORIAL_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { background: '#FFFDF8', accent: '#8F3D52' },
  surfaces: { canvas: '#FFFDF8', code: '#F4EEE8', inlineCode: '#F2E8E4', tableHeader: '#F7F0EB' },
  accents: { primary: '#8F3D52', primaryHover: '#742F41' },
  text: { link: '#8F3D52', wikilink: '#8F3D52' },
})
const EDITORIAL_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { background: '#211D1B', accent: '#E39AAA' },
  surfaces: { canvas: '#211D1B', code: '#2A2221', inlineCode: '#382A2A', tableHeader: '#302625' },
  accents: { primary: '#E39AAA', primaryHover: '#F2B8C5' },
  text: { link: '#E39AAA', wikilink: '#E39AAA' },
  compatibility: { editorCodeBlockBackground: '#2A2221', editorCodeBlockText: '#FFF4F0', editorCodeBlockLanguage: '#F3C4CC' },
})

const CANVAS_LIGHT_VARIANT = createVariant(DEFAULT_LIGHT_VARIANT, {
  colors: { background: '#F8FAFD', accent: '#4F46B8' },
  surfaces: { canvas: '#F8FAFD', code: '#EEF2F7', inlineCode: '#E8EDF6', tableHeader: '#EFF3F9' },
  accents: { primary: '#4F46B8', primaryHover: '#4338A3' },
  text: { link: '#4F46B8', wikilink: '#4F46B8' },
})
const CANVAS_DARK_VARIANT = createVariant(DEFAULT_DARK_VARIANT, {
  colors: { background: '#202225', accent: '#A8A4FF' },
  surfaces: { canvas: '#202225', code: '#292C35', inlineCode: '#343744', tableHeader: '#2C303A' },
  accents: { primary: '#A8A4FF', primaryHover: '#C1BEFF' },
  text: { link: '#A8A4FF', wikilink: '#A8A4FF' },
  compatibility: { editorCodeBlockBackground: '#292C35', editorCodeBlockText: '#F5F5FF', editorCodeBlockLanguage: '#C9C6FF' },
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
      editor: { fontSize: 14, lineHeight: 1.45, maxWidth: 900, paddingHorizontal: 32, paragraphSpacing: 6 },
      codeFontFamily: '"JetBrains Mono", ui-monospace, monospace',
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
      editor: { fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, lineHeight: 1.65, maxWidth: 720, paddingHorizontal: 32, paragraphSpacing: 12 },
      codeFontFamily: '"JetBrains Mono", ui-monospace, monospace',
    }),
    variants: { light: EDITORIAL_LIGHT_VARIANT, dark: EDITORIAL_DARK_VARIANT },
  },
  {
    schemaVersion: EDITOR_THEME_SCHEMA_VERSION,
    id: 'canvas',
    displayName: 'Canvas',
    descriptionKey: 'editorTheme.canvas.description',
    shared: createSharedTokens({
      editor: { fontSize: 15, lineHeight: 1.55, maxWidth: 1040, paddingHorizontal: 48, paddingVertical: 28, paragraphSpacing: 10 },
      codeFontFamily: '"JetBrains Mono", ui-monospace, monospace',
    }),
    variants: { light: CANVAS_LIGHT_VARIANT, dark: CANVAS_DARK_VARIANT },
  },
] satisfies readonly EditorThemeDefinition[]

export const EDITOR_THEME_CATALOG: EditorThemeCatalog = validateEditorThemeCatalog(RAW_EDITOR_THEME_CATALOG)
