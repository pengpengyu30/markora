import { CaretDown, Check } from '@phosphor-icons/react'
import { Menu as MantineMenu, Button as MantineButton } from '@mantine/core'
import type { CSSProperties } from 'react'
import type { AppLocale, TranslationKey } from '../lib/i18n'
import {
  MARKDOWN_HIGHLIGHT_COLOR_OPTIONS,
  type MarkdownHighlightColor,
} from '../utils/markdownHighlightMarkdown'
import { translate } from '../lib/i18n'

export interface MarkdownHighlightColorMenuProps {
  currentColor: MarkdownHighlightColor
  locale: AppLocale
  onSelect: (color: MarkdownHighlightColor) => void
}

function colorLabel(locale: AppLocale, localeKey: string): string {
  return translate(locale, localeKey as TranslationKey)
}

function colorSwatchStyle(color: MarkdownHighlightColor): CSSProperties {
  return {
    backgroundColor: `var(--accent-${color}-light)`,
    borderColor: `var(--accent-${color})`,
  }
}

export function MarkdownHighlightColorMenu({
  currentColor,
  locale,
  onSelect,
}: MarkdownHighlightColorMenuProps) {
  const label = translate(locale, 'editor.formatting.highlightColor')

  return (
    <MantineMenu
      withinPortal={false}
      transitionProps={{ exitDuration: 0 }}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
    >
      <MantineMenu.Target>
        <MantineButton
          aria-label={label}
          className="markora-highlight-color-trigger"
          data-test="highlightColorMenu"
          onMouseDown={(event) => event.preventDefault()}
          rightSection={<CaretDown aria-hidden="true" size={12} />}
          size="compact-xs"
          type="button"
          variant="subtle"
        />
      </MantineMenu.Target>
      <MantineMenu.Dropdown className="markora-highlight-color-dropdown">
        {MARKDOWN_HIGHLIGHT_COLOR_OPTIONS.map((option) => {
          const color = option.color as MarkdownHighlightColor
          return (
            <MantineMenu.Item
              key={color}
              data-test={`highlightColor-${color}`}
              leftSection={(
                <span
                  aria-hidden="true"
                  className={`markora-highlight-color-swatch markora-highlight-color-swatch--${color}`}
                  style={colorSwatchStyle(color)}
                />
              )}
              onClick={() => onSelect(color)}
              onMouseDown={(event) => event.preventDefault()}
              rightSection={currentColor === color ? <Check aria-hidden="true" size={14} /> : undefined}
            >
              {colorLabel(locale, option.localeKey)}
            </MantineMenu.Item>
          )
        })}
      </MantineMenu.Dropdown>
    </MantineMenu>
  )
}
