import {
  flattenEditorTheme,
  type EffectiveEditorTheme,
} from './editorThemeCatalog'
import { DEFAULT_NOTE_WIDTH_PX } from '../utils/noteWidth'

export const EDITOR_THEME_LABORATORY_WIDTH_MODES = ['theme', 'normal', 'wide'] as const
export type ThemeLaboratoryWidthMode = typeof EDITOR_THEME_LABORATORY_WIDTH_MODES[number]

function colorMix(colorVariable: string, percentage: number, baseVariable: string): string {
  return `color-mix(in srgb, var(${colorVariable}) ${percentage}%, var(${baseVariable}))`
}

export function buildThemeLaboratoryStyle(
  theme: EffectiveEditorTheme,
  widthMode: ThemeLaboratoryWidthMode,
): Record<string, string> {
  const style = flattenEditorTheme(theme)
  style['--editor-max-width'] = widthMode === 'wide'
    ? 'none'
    : `${widthMode === 'normal' ? DEFAULT_NOTE_WIDTH_PX : theme.shared.editor.maxWidth}px`

  Object.assign(style, {
    '--surface-app': 'var(--editor-theme-surfaces-canvas)',
    '--surface-editor': 'var(--editor-theme-surfaces-canvas)',
    '--surface-sidebar': 'var(--editor-theme-surfaces-code)',
    '--surface-panel': 'var(--editor-theme-surfaces-callout)',
    '--surface-card': 'var(--editor-theme-surfaces-callout)',
    '--surface-popover': 'var(--editor-theme-embedded-controls-background)',
    '--surface-input': 'var(--editor-theme-surfaces-canvas)',
    '--surface-button': 'var(--editor-theme-embedded-controls-background)',
    '--text-primary': 'var(--editor-theme-text-primary)',
    '--text-secondary': 'var(--editor-theme-text-secondary)',
    '--text-tertiary': 'var(--editor-theme-text-secondary)',
    '--text-muted': 'var(--editor-theme-text-muted)',
    '--text-faint': 'var(--editor-theme-text-muted)',
    '--text-heading': 'var(--editor-theme-text-heading)',
    '--text-inverse': 'var(--editor-theme-text-inverse)',
    '--border-default': 'var(--editor-theme-borders-default)',
    '--border-subtle': 'var(--editor-theme-borders-subtle)',
    '--border-strong': 'var(--editor-theme-borders-strong)',
    '--border-primary': 'var(--editor-theme-borders-divider)',
    '--border': 'var(--editor-theme-borders-default)',
    '--border-focus': 'var(--editor-theme-borders-focus)',
    '--state-hover': 'var(--editor-theme-embedded-controls-hover-background)',
    '--state-hover-subtle': 'var(--editor-theme-surfaces-active-line)',
    '--state-selected': 'var(--editor-theme-surfaces-selection)',
    '--state-focus-ring': 'var(--editor-theme-borders-focus)',
    '--bg-primary': 'var(--editor-theme-surfaces-canvas)',
    '--bg-sidebar': 'var(--editor-theme-surfaces-code)',
    '--bg-card': 'var(--editor-theme-surfaces-callout)',
    '--bg-hover': 'var(--editor-theme-embedded-controls-hover-background)',
    '--bg-hover-subtle': 'var(--editor-theme-surfaces-inline-code)',
    '--bg-selected': 'var(--editor-theme-surfaces-selection)',
    '--link-color': 'var(--editor-theme-text-link)',
    '--link-hover': 'var(--editor-theme-accents-primary-hover)',
    '--accent-blue': 'var(--editor-theme-accents-primary)',
    '--accent-blue-hover': 'var(--editor-theme-accents-primary-hover)',
    '--accent-blue-light': colorMix('--editor-theme-accents-highlights-blue', 14, '--editor-theme-surfaces-canvas'),
    '--accent-green': 'var(--editor-theme-accents-highlights-green)',
    '--accent-green-light': colorMix('--editor-theme-accents-highlights-green', 14, '--editor-theme-surfaces-canvas'),
    '--accent-red': 'var(--editor-theme-accents-highlights-red)',
    '--accent-red-light': colorMix('--editor-theme-accents-highlights-red', 14, '--editor-theme-surfaces-canvas'),
    '--accent-purple': 'var(--editor-theme-accents-highlights-purple)',
    '--accent-purple-light': colorMix('--editor-theme-accents-highlights-purple', 14, '--editor-theme-surfaces-canvas'),
    '--accent-yellow-light': 'var(--editor-theme-feedback-warning-background)',
    '--accent-orange-light': 'var(--editor-theme-feedback-warning-background)',
    '--accent-gray-light': 'var(--editor-theme-feedback-quote-background)',
    '--accent-teal-light': 'var(--editor-theme-feedback-info-background)',
    '--feedback-info-text': 'var(--editor-theme-feedback-info-text)',
    '--feedback-info-bg': 'var(--editor-theme-feedback-info-background)',
    '--feedback-info-border': 'var(--editor-theme-feedback-info-border)',
    '--feedback-success-text': 'var(--editor-theme-feedback-success-text)',
    '--feedback-success-bg': 'var(--editor-theme-feedback-success-background)',
    '--feedback-success-border': 'var(--editor-theme-feedback-success-border)',
    '--feedback-warning-text': 'var(--editor-theme-feedback-warning-text)',
    '--feedback-warning-bg': 'var(--editor-theme-feedback-warning-background)',
    '--feedback-warning-border': 'var(--editor-theme-feedback-warning-border)',
    '--feedback-error-text': 'var(--editor-theme-feedback-error-text)',
    '--feedback-error-bg': 'var(--editor-theme-feedback-error-background)',
    '--feedback-error-border': 'var(--editor-theme-feedback-error-border)',
    '--surface-secondary': 'var(--editor-theme-feedback-quote-background)',
    '--foreground': 'var(--editor-theme-text-primary)',
    '--color-foreground': 'var(--editor-theme-text-primary)',
    '--card': 'var(--editor-theme-surfaces-callout)',
    '--card-foreground': 'var(--editor-theme-text-primary)',
    '--popover': 'var(--editor-theme-embedded-controls-background)',
    '--popover-foreground': 'var(--editor-theme-embedded-controls-text)',
    '--primary': 'var(--editor-theme-accents-primary)',
    '--primary-foreground': 'var(--editor-theme-text-inverse)',
    '--accent': 'var(--editor-theme-embedded-controls-hover-background)',
    '--accent-foreground': 'var(--editor-theme-text-primary)',
    '--destructive': 'var(--editor-theme-text-error)',
    '--destructive-foreground': 'var(--editor-theme-text-inverse)',
    '--input': 'var(--editor-theme-borders-default)',
    '--ring': 'var(--editor-theme-borders-focus)',
  })

  return style
}
