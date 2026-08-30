import fixtureImageUrl from '../../tests/fixtures/test-vault/attachments/phase-0-baseline.png?url'
import fixtureMarkdown from '../../tests/fixtures/test-vault/note/editor-themes-phase-0.md?raw'

export const EDITOR_THEME_LABORATORY_FIXTURE_PATH = 'theme-laboratory/editor-themes-phase-3.md'

export const EDITOR_THEME_LABORATORY_MARKDOWN = fixtureMarkdown.replace(
  'attachments/phase-0-baseline.png',
  fixtureImageUrl,
)
