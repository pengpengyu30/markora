import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { SidebarTagsSection } from './SidebarTagsSection'

function makeEntry(path: string, tags: string[]): VaultEntry {
  return { path, properties: { tags } } as VaultEntry
}

describe('SidebarTagsSection', () => {
  it('renders usage-sorted tags with count badges and supports multi-select', () => {
    const onToggleTag = vi.fn()
    render(
      <SidebarTagsSection
        entries={[
          makeEntry('/vault/a.md', ['shared', 'alpha']),
          makeEntry('/vault/b.md', ['shared']),
        ]}
        selectedTags={['shared']}
        onToggleTag={onToggleTag}
        collapsed={false}
        onToggle={vi.fn()}
        locale="en"
      />,
    )

    expect(screen.getByTestId('sidebar-tags')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shared.*2/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /alpha.*1/i })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: /alpha.*1/i }))
    expect(onToggleTag).toHaveBeenCalledWith('alpha')
  })

  it('does not render an empty tags section', () => {
    const { container } = render(
      <SidebarTagsSection
        entries={[]}
        selectedTags={[]}
        onToggleTag={vi.fn()}
        collapsed={false}
        onToggle={vi.fn()}
        locale="en"
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
