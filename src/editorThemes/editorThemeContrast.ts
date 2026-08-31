import type { EffectiveEditorTheme } from './editorThemeCatalog'

export interface RgbColor {
  red: number
  green: number
  blue: number
}

export interface EditorThemeContrastPair {
  name: string
  foreground: string
  background: string
  largeText?: boolean
}

export function parseHexColor(value: string): RgbColor | null {
  const normalized = value.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu.test(normalized)) return null

  const expanded = normalized.length === 3
    ? normalized.split('').map((digit) => `${digit}${digit}`).join('')
    : normalized

  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16),
  }
}

function linearize(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(color: RgbColor | null): number {
  if (!color) throw new Error('A valid hexadecimal color is required')
  return (0.2126 * linearize(color.red))
    + (0.7152 * linearize(color.green))
    + (0.0722 * linearize(color.blue))
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground))
  const backgroundLuminance = relativeLuminance(parseHexColor(background))
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsWcagAa(
  foreground: string,
  background: string,
  largeText = false,
): boolean {
  try {
    return contrastRatio(foreground, background) >= (largeText ? 3 : 4.5)
  } catch {
    return false
  }
}

export function editorThemeContrastPairs(theme: EffectiveEditorTheme): EditorThemeContrastPair[] {
  const { surfaces, text, syntax, mermaid, feedback } = theme.tokens
  return [
    { name: 'body', foreground: text.primary, background: surfaces.canvas },
    { name: 'secondary text', foreground: text.secondary, background: surfaces.canvas },
    { name: 'muted text', foreground: text.muted, background: surfaces.canvas },
    { name: 'heading', foreground: text.heading, background: surfaces.canvas },
    { name: 'link', foreground: text.link, background: surfaces.canvas },
    { name: 'wikilink', foreground: text.wikilink, background: surfaces.canvas },
    { name: 'inline code', foreground: text.code, background: surfaces.inlineCode },
    { name: 'gutter text', foreground: text.secondary, background: surfaces.gutter },
    { name: 'code foreground', foreground: syntax.foreground, background: syntax.codeSurface },
    { name: 'code comment', foreground: syntax.comment, background: syntax.codeSurface },
    { name: 'code keyword', foreground: syntax.keyword, background: syntax.codeSurface },
    { name: 'code string', foreground: syntax.string, background: syntax.codeSurface },
    { name: 'Mermaid label', foreground: mermaid.text, background: mermaid.background },
    { name: 'Mermaid node label', foreground: mermaid.text, background: mermaid.nodeBackground },
    { name: 'Mermaid node border', foreground: mermaid.nodeBorder, background: mermaid.nodeBackground },
    { name: 'Mermaid cluster label', foreground: mermaid.text, background: mermaid.cluster },
    { name: 'Mermaid edge', foreground: mermaid.edge, background: mermaid.background },
    { name: 'info feedback', foreground: feedback.info.text, background: feedback.info.background },
    { name: 'success feedback', foreground: feedback.success.text, background: feedback.success.background },
    { name: 'warning feedback', foreground: feedback.warning.text, background: feedback.warning.background },
    { name: 'error feedback', foreground: feedback.error.text, background: feedback.error.background },
    { name: 'note feedback', foreground: feedback.note.text, background: feedback.note.background },
    { name: 'example feedback', foreground: feedback.example.text, background: feedback.example.background },
    { name: 'quote feedback', foreground: feedback.quote.text, background: feedback.quote.background },
  ]
}
