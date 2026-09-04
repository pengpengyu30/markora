export const EDITOR_THEME_FONT_FAMILIES = {
  inter: 'Tolaria Inter',
  sourceSerif: 'Tolaria Source Serif',
  jetBrainsMono: 'Tolaria JetBrains Mono',
} as const

export type EditorThemeFontFamily = typeof EDITOR_THEME_FONT_FAMILIES[keyof typeof EDITOR_THEME_FONT_FAMILIES]

export interface EditorThemeFontAsset {
  id: string
  family: EditorThemeFontFamily
  style: 'normal' | 'italic'
  weightRange: string
  fileName: string
  licenseFile: string
  sourceVersion: string
}

export const EDITOR_THEME_FONT_ASSETS: readonly EditorThemeFontAsset[] = [
  {
    id: 'inter-latin-normal',
    family: EDITOR_THEME_FONT_FAMILIES.inter,
    style: 'normal',
    weightRange: '100 900',
    fileName: 'inter-latin-var.woff2',
    licenseFile: 'OFL-Inter.txt',
    sourceVersion: 'Inter v20, Google Fonts Latin variable subset',
  },
  {
    id: 'source-serif-latin-normal',
    family: EDITOR_THEME_FONT_FAMILIES.sourceSerif,
    style: 'normal',
    weightRange: '200 900',
    fileName: 'source-serif-latin-var.woff2',
    licenseFile: 'OFL-Source-Serif-4.txt',
    sourceVersion: 'Source Serif 4 v14, Google Fonts Latin variable subset',
  },
  {
    id: 'source-serif-latin-italic',
    family: EDITOR_THEME_FONT_FAMILIES.sourceSerif,
    style: 'italic',
    weightRange: '200 900',
    fileName: 'source-serif-latin-italic-var.woff2',
    licenseFile: 'OFL-Source-Serif-4.txt',
    sourceVersion: 'Source Serif 4 v14, Google Fonts Latin variable subset',
  },
  {
    id: 'jetbrains-mono-latin-normal',
    family: EDITOR_THEME_FONT_FAMILIES.jetBrainsMono,
    style: 'normal',
    weightRange: '100 800',
    fileName: 'jetbrains-mono-latin-var.woff2',
    licenseFile: 'OFL-JetBrains-Mono.txt',
    sourceVersion: 'JetBrains Mono v24, Google Fonts Latin variable subset',
  },
  {
    id: 'jetbrains-mono-latin-italic',
    family: EDITOR_THEME_FONT_FAMILIES.jetBrainsMono,
    style: 'italic',
    weightRange: '100 800',
    fileName: 'jetbrains-mono-latin-italic-var.woff2',
    licenseFile: 'OFL-JetBrains-Mono.txt',
    sourceVersion: 'JetBrains Mono v24, Google Fonts Latin variable subset',
  },
] as const
