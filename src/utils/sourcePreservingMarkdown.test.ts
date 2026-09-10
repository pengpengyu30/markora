import { describe, expect, it } from 'vitest'
import { preserveMarkdownSourceFormatting } from './sourcePreservingMarkdown'

describe('source-preserving Markdown edits', () => {
  it('keeps original fences, list markers, indentation, and blank lines', () => {
    const source = [
      '# Root',
      '',
      '* Parent',
      '',
      '   1. Child',
      '',
      '      ~~~markdown',
      '      # Inner Markdown',
      '',
      '      **bold** and `inline code`',
      '      ~~~',
      '',
      '* Next item',
    ].join('\n')
    const serialized = [
      '# Root',
      '',
      '- Parent',
      '   1. Child',
      '```markdown',
      '# Inner Markdown',
      '',
      '**bold** and `inline code`',
      '```',
      '- Next item',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(source)
  })

  it('patches a changed line without rewriting surrounding source layout', () => {
    const source = [
      '# Root',
      '',
      '1. Parent',
      '',
      '   1. Child',
      '',
      '      ~~~markdown',
      '      # Inner Markdown',
      '',
      '      **bold** and `inline code`',
      '      ~~~',
      '',
      '2. Keep this line',
      '',
    ].join('\n')
    const serialized = [
      '# Root',
      '',
      '1. Parent',
      '   1. Child',
      '```markdown',
      '# Inner Markdown',
      '',
      '**bold** and `inline code`',
      '```',
      '2. Keep this edited line',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(
      source.replace('2. Keep this line', '2. Keep this edited line'),
    )
  })

  it('preserves CRLF and the absence of a trailing newline', () => {
    const source = '1. First\r\n\r\n   ~~~markdown\r\n   # Inner\r\n   ~~~'
    const serialized = '1. First\n```markdown\n# Inner\n```'

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(source)
  })

  it('keeps the original fence when the code block content changes', () => {
    const source = [
      '1. Parent',
      '',
      '   ~~~markdown',
      '   # Inner Markdown',
      '   ~~~',
    ].join('\n')
    const serialized = [
      '1. Parent',
      '```markdown',
      '# Inner Edited',
      '```',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe([
      '1. Parent',
      '',
      '   ~~~markdown',
      '   # Inner Edited',
      '   ~~~',
    ].join('\n'))
  })

  it('keeps newly inserted code blocks next to existing code blocks', () => {
    const source = [
      '# Code Block Theme',
      '',
      '```ts',
      'const existing = true',
      '```',
      '',
      'Convert this paragraph with the shortcut.',
      '',
      'Navigation boundary before.',
      '',
      '```text',
      'alpha',
      'bravo',
      'charlie',
      '```',
      '',
      'Navigation boundary after.',
    ].join('\n')
    const serialized = [
      '# Code Block Theme',
      '',
      '```ts',
      'const existing = true',
      '```',
      '',
      'Convert this paragraph with the shortcut.',
      '',
      '```cpp',
      '#include <iostream>',
      'int main() { return 0; }',
      '```',
      '',
      'Navigation boundary before.',
      '',
      '```text',
      'alpha',
      'bravo',
      'charlie',
      '```',
      '',
      'Navigation boundary after.',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe([
      '# Code Block Theme',
      '',
      '```ts',
      'const existing = true',
      '```',
      '',
      'Convert this paragraph with the shortcut.',
      '',
      '```cpp',
      '#include <iostream>',
      'int main() { return 0; }',
      '```',
      '',
      'Navigation boundary before.',
      '',
      '```text',
      'alpha',
      'bravo',
      'charlie',
      '```',
      '',
      'Navigation boundary after.',
    ].join('\n'))
  })

  it('preserves whitespace-only lines and matches repeated-language fences by full content', () => {
    const source = [
      '1. First item',
      '   ',
      '   ~~~markdown',
      '   # Shared heading',
      '   first block',
      '   ~~~',
      '  ',
      '2. Second item',
      '    ~~~markdown',
      '    # Shared heading',
      '    second block',
      '    ~~~',
    ].join('\n')
    const serialized = [
      '1. First item',
      '```markdown',
      '# Shared heading',
      'first block',
      '```',
      '2. Second item',
      '```markdown',
      '# Shared heading',
      'second block',
      '```',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(source)
  })

  it('does not copy serializer-generated blank runs into the source', () => {
    const source = 'First paragraph\n\nSecond paragraph'
    const serialized = 'First paragraph\n\n\n\n\nSecond paragraph'

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(source)
  })

  it('preserves equivalent links, images, escapes, and nested code content', () => {
    const source = [
      '2. **embedded_schema_validation** stays readable TODO',
      '![image](/Users/example/image.png)',
      'MR: https://example.com/merge_requests/1051',
      '',
      '   ~~~markdown',
      '   ~/design/lbc-apisix目录做了一些工作',
      '   ~~~',
    ].join('\n')
    const serialized = [
      '1. **embedded\\_schema\\_validation** stays readable TODO',
      '\\![image](/Users/example/image.png)',
      'MR: [https://example.com/merge\\_requests/1051](https://example.com/merge_requests/1051)',
      '```markdown',
      '\\~/design/lbc-apisix目录做了一些工作',
      '```',
    ].join('\n')

    expect(preserveMarkdownSourceFormatting(source, serialized)).toBe(source)
  })
})
