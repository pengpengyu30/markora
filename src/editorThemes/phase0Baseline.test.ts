import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const FIXTURE_PATH = 'tests/fixtures/test-vault/note/editor-themes-phase-0.md'

describe('editor theme Phase 0 fixture', () => {
  it('covers the Markdown surfaces required for visual baseline review', () => {
    const markdown = readFileSync(FIXTURE_PATH, 'utf8')

    expect(markdown).toContain('# Editor Themes Phase 0')
    expect(markdown).toContain('## Typography and inline content')
    expect(markdown).toContain('**bold**')
    expect(markdown).toContain('*italic*')
    expect(markdown).toContain('[external link](')
    expect(markdown).toContain('[[Alpha Project]]')
    expect(markdown).toContain('- [x]')
    expect(markdown).toContain('> A regular blockquote.')
    expect(markdown).toContain('> [!info]')
    expect(markdown).toContain('> [!tip]')
    expect(markdown).toContain('> [!success]')
    expect(markdown).toContain('> [!warning]')
    expect(markdown).toContain('> [!danger]')
    expect(markdown).toContain('> [!example]')
    expect(markdown).toContain('> [!quote]')
    expect(markdown).toContain('| Feature | Status |')
    expect(markdown).toContain('\n---\n')
    expect(markdown).toContain('`inline code`')
    expect(markdown).toContain('```typescript')
    expect(markdown).toContain('```yaml')
    expect(markdown).toContain('==🔴red==')
    expect(markdown).toContain('==🟢green==')
    expect(markdown).toContain('==🔵blue==')
    expect(markdown).toContain('==🟣purple==')
    expect(markdown).toContain('$E=mc^2$')
    expect(markdown).toContain('```mermaid')
    expect(markdown).toContain('![Fixture image](attachments/phase-0-baseline.png)')
    expect(markdown).toContain('中文混合')
  })
})
