import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { yamlFrontmatter } from '@codemirror/lang-yaml'
import { HighlightStyle, LanguageDescription, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'
import {
  DEFAULT_EDITOR_THEME_ID,
  resolveEffectiveEditorTheme,
  type EffectiveEditorTheme,
} from '../editorThemes/editorThemeCatalog'
import { rawEditorSyntaxRoleMap } from './rawEditorSyntaxRoles'

const markdownCodeLanguages = [
  LanguageDescription.of({
    name: 'html',
    alias: ['htm'],
    extensions: ['html', 'htm'],
    support: html(),
  }),
]

export function rawEditorSyntaxHighlighting(
  theme: EffectiveEditorTheme = resolveEffectiveEditorTheme(DEFAULT_EDITOR_THEME_ID, 'light'),
): Extension {
  const roles = rawEditorSyntaxRoleMap(theme)
  const markdownHighlightStyle = HighlightStyle.define([
    { tag: tags.heading1, color: roles.heading, fontWeight: '700', fontSize: '1.4em' },
    { tag: tags.heading2, color: roles.heading, fontWeight: '700', fontSize: '1.25em' },
    { tag: tags.heading3, color: roles.heading, fontWeight: '600', fontSize: '1.1em' },
    { tag: [tags.heading4, tags.heading5, tags.heading6], color: roles.heading, fontWeight: '600' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },
    { tag: [tags.link, tags.url], color: roles.link, textDecoration: 'underline' },
    { tag: tags.monospace, color: roles.monospace, backgroundColor: roles.monospaceBackground, borderRadius: '3px' },
    { tag: tags.quote, color: roles.muted, fontStyle: 'italic' },
    { tag: [tags.separator, tags.processingInstruction, tags.contentSeparator], color: roles.muted },
    { tag: tags.comment, color: roles.comment, fontStyle: 'italic' },
    { tag: tags.keyword, color: roles.keyword, fontWeight: '600' },
    { tag: [tags.atom, tags.bool, tags.null], color: roles.atom },
    { tag: tags.number, color: roles.number },
    { tag: [tags.string, tags.special(tags.string)], color: roles.string },
    { tag: [tags.variableName, tags.propertyName], color: roles.variableProperty },
    { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: roles.function },
    { tag: [tags.typeName, tags.className], color: roles.type },
    { tag: [tags.operator, tags.punctuation], color: roles.operator },
  ])
  return syntaxHighlighting(markdownHighlightStyle)
}

export function markdownLanguage(
  syntaxHighlightingExtension: Extension | null = rawEditorSyntaxHighlighting(),
): Extension {
  return [
    yamlFrontmatter({ content: markdown({ codeLanguages: markdownCodeLanguages }) }),
    ...(syntaxHighlightingExtension ? [syntaxHighlightingExtension] : []),
  ]
}
