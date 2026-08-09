import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { BacklinksPanel } from './BacklinksPanel'

describe('BacklinksPanel', () => {
  it('renders backlink context and navigates to the source note', () => {
    const onNavigate = vi.fn()
    const source = makeEntry({ title: 'Source Note', icon: '📝' })

    render(
      <BacklinksPanel
        backlinks={[{ entry: source, context: 'A reference to the target note.' }]}
        onNavigate={onNavigate}
      />,
    )

    expect(screen.getByText('Backlinks')).toBeInTheDocument()
    expect(screen.getByText('A reference to the target note.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Source Note/ }))

    expect(onNavigate).toHaveBeenCalledWith('Source Note')
  })

  it('renders no panel when there are no backlinks', () => {
    const { container } = render(<BacklinksPanel backlinks={[]} onNavigate={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
