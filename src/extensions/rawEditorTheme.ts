import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  DEFAULT_EDITOR_THEME_ID,
  resolveEffectiveEditorTheme,
  type EffectiveEditorTheme,
} from '../editorThemes/editorThemeCatalog'
import { frontmatterHighlightTheme } from './frontmatterHighlight'
import { rawEditorSyntaxHighlighting } from './markdownHighlight'
import { rawEditorSyntaxRoleMap, type RawEditorSyntaxRoleMap } from './rawEditorSyntaxRoles'

export { rawEditorSyntaxRoleMap }
export type { RawEditorSyntaxRoleMap }

export const DEFAULT_RAW_EDITOR_THEME = resolveEffectiveEditorTheme(DEFAULT_EDITOR_THEME_ID, 'light')

export interface RawEditorThemeStyle {
  editor: {
    fontFamily: string
    fontSize: string
    lineHeight: string
    backgroundColor: string
    color: string
  }
  scroller: {
    fontFamily: string
    lineHeight: string
    padding: string
  }
  content: {
    padding: string
    caretColor: string
  }
  gutters: {
    backgroundColor: string
    color: string
    borderRight: string
  }
  activeLine: {
    backgroundColor: string
  }
  selection: {
    backgroundColor: string
  }
  cursor: {
    borderLeftColor: string
  }
}

export function rawEditorThemeStyle(theme: EffectiveEditorTheme): RawEditorThemeStyle {
  const { editor } = theme.shared
  const { surfaces, text, borders, colors } = theme.tokens
  return {
    editor: {
      fontFamily: editor.rawFontFamily,
      fontSize: `${editor.rawFontSize}px`,
      lineHeight: String(editor.rawLineHeight),
      backgroundColor: surfaces.canvas,
      color: text.primary,
    },
    scroller: {
      fontFamily: editor.rawFontFamily,
      lineHeight: String(editor.rawLineHeight),
      padding: '0',
    },
    content: {
      padding: `${editor.paddingVertical}px ${editor.paddingHorizontal}px ${editor.paddingVertical}px 12px`,
      caretColor: colors.cursor,
    },
    gutters: {
      backgroundColor: surfaces.gutter,
      color: text.muted,
      borderRight: `1px solid ${borders.gutter}`,
    },
    activeLine: {
      backgroundColor: surfaces.activeLine,
    },
    selection: {
      backgroundColor: surfaces.selection,
    },
    cursor: {
      borderLeftColor: colors.cursor,
    },
  }
}

export function createRawEditorTheme(theme: EffectiveEditorTheme = DEFAULT_RAW_EDITOR_THEME): Extension {
  const style = rawEditorThemeStyle(theme)
  return [
    EditorView.theme({
      '&': {
        fontFamily: style.editor.fontFamily,
        fontSize: style.editor.fontSize,
        lineHeight: style.editor.lineHeight,
        backgroundColor: style.editor.backgroundColor,
        color: style.editor.color,
        flex: '1',
        minHeight: '0',
      },
      '.cm-scroller': {
        fontFamily: style.scroller.fontFamily,
        lineHeight: style.scroller.lineHeight,
        padding: style.scroller.padding,
        overflow: 'auto',
      },
      '.cm-content': {
        padding: style.content.padding,
        caretColor: style.content.caretColor,
      },
      '.cm-gutters': {
        backgroundColor: style.gutters.backgroundColor,
        color: style.gutters.color,
        borderRight: style.gutters.borderRight,
        minHeight: '100%',
        paddingTop: '0',
        paddingLeft: '6px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        paddingRight: '12px',
        minWidth: '28px',
        textAlign: 'right',
      },
      '.cm-activeLine': {
        backgroundColor: style.activeLine.backgroundColor,
      },
      '.cm-activeLineGutter': {
        backgroundColor: style.activeLine.backgroundColor,
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: style.selection.backgroundColor,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: style.cursor.borderLeftColor,
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-line': {
        padding: '0',
        unicodeBidi: 'plaintext',
        textAlign: 'start',
      },
    }, { dark: theme.variant === 'dark' }),
    rawEditorSyntaxHighlighting(theme),
    frontmatterHighlightTheme(theme),
  ]
}
