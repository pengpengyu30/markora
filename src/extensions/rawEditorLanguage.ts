import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import type { Extension } from '@codemirror/state'
import { rawEditorLanguageIdForPath, type RawEditorLanguageId } from '../utils/rawEditorLanguage'
import { frontmatterHighlightPlugin, frontmatterHighlightTheme } from './frontmatterHighlight'
import { markdownLanguage, rawEditorSyntaxHighlighting } from './markdownHighlight'

function javascriptLanguage(id: RawEditorLanguageId): Extension {
  if (id === 'typescript') return javascript({ typescript: true })
  if (id === 'tsx') return javascript({ jsx: true, typescript: true })
  if (id === 'jsx') return javascript({ jsx: true })
  return javascript()
}

interface RawEditorLanguageOptions {
  syntaxHighlighting?: Extension | null
  frontmatterTheme?: Extension | null
}

function highlighted(language: Extension, syntaxHighlighting: Extension | null): Extension[] {
  return syntaxHighlighting ? [language, syntaxHighlighting] : [language]
}

function markupLanguage(
  id: RawEditorLanguageId,
  syntaxHighlighting: Extension | null,
  frontmatterTheme: Extension | null,
): Extension[] | null {
  switch (id) {
    case 'html': return highlighted(html(), syntaxHighlighting)
    case 'json': return highlighted(json(), syntaxHighlighting)
    case 'markdown': return [markdownLanguage(syntaxHighlighting), ...(frontmatterTheme ? [frontmatterTheme] : []), frontmatterHighlightPlugin]
    case 'plain': return []
    case 'python': return highlighted(python(), syntaxHighlighting)
    case 'sql': return highlighted(sql(), syntaxHighlighting)
    case 'yaml': return highlighted(yaml(), syntaxHighlighting)
    default: return null
  }
}

function scriptLanguage(id: RawEditorLanguageId, syntaxHighlighting: Extension | null): Extension[] {
  switch (id) {
    case 'javascript': return highlighted(javascriptLanguage('javascript'), syntaxHighlighting)
    case 'jsx': return highlighted(javascriptLanguage('jsx'), syntaxHighlighting)
    case 'tsx': return highlighted(javascriptLanguage('tsx'), syntaxHighlighting)
    case 'typescript': return highlighted(javascriptLanguage('typescript'), syntaxHighlighting)
    default: return []
  }
}

function rawEditorLanguage(
  id: RawEditorLanguageId,
  syntaxHighlighting: Extension | null,
  frontmatterTheme: Extension | null,
): Extension[] {
  return markupLanguage(id, syntaxHighlighting, frontmatterTheme) ?? scriptLanguage(id, syntaxHighlighting)
}

export function rawEditorLanguageExtensionsForPath(
  path?: string | null,
  options: RawEditorLanguageOptions = {},
): Extension[] {
  const syntaxHighlighting = options.syntaxHighlighting === undefined
    ? rawEditorSyntaxHighlighting()
    : options.syntaxHighlighting
  const frontmatterTheme = options.frontmatterTheme === undefined
    ? frontmatterHighlightTheme()
    : options.frontmatterTheme
  return rawEditorLanguage(rawEditorLanguageIdForPath(path), syntaxHighlighting, frontmatterTheme)
}
