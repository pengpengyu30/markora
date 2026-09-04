import type { EffectiveEditorTheme } from '../editorThemes/editorThemeCatalog'

export interface RawEditorSyntaxRoleMap {
  atom: string
  comment: string
  foreground: string
  heading: string
  keyword: string
  link: string
  monospace: string
  monospaceBackground: string
  muted: string
  quote: string
  number: string
  operator: string
  string: string
  function: string
  type: string
  variableProperty: string
  frontmatterKey: string
  frontmatterValue: string
  invalidError: string
}

export function rawEditorSyntaxRoleMap(theme: EffectiveEditorTheme): RawEditorSyntaxRoleMap {
  const { syntax } = theme.tokens
  return {
    atom: syntax.number,
    comment: syntax.comment,
    foreground: syntax.foreground,
    heading: theme.tokens.text.heading,
    keyword: syntax.keyword,
    link: theme.tokens.text.link,
    monospace: theme.tokens.text.code,
    monospaceBackground: theme.tokens.surfaces.inlineCode,
    muted: syntax.mutedPunctuation,
    quote: syntax.mutedPunctuation,
    number: syntax.number,
    operator: syntax.operator,
    string: syntax.string,
    function: syntax.function,
    type: syntax.typeClass,
    variableProperty: syntax.variableProperty,
    frontmatterKey: syntax.keyword,
    frontmatterValue: syntax.string,
    invalidError: syntax.invalidError,
  }
}
