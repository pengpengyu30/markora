import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultOption } from './status-bar/types'
import { ProjectSettingsSection } from './ProjectSettingsSection'

const project: VaultOption = {
  label: 'Edge Console',
  path: '/projects/edge-console',
  alias: 'edge-console',
  shortLabel: 'EC',
  color: 'blue',
  available: true,
  mounted: true,
}

describe('ProjectSettingsSection', () => {
  it('shows the project identity controls and persists edited names', () => {
    const onUpdateProjectIdentity = vi.fn()
    render(
      <ProjectSettingsSection
        defaultProjectPath={project.path}
        enabled={true}
        locale="en"
        onEnabledChange={() => {}}
        onUpdateProjectIdentity={onUpdateProjectIdentity}
        projects={[project]}
      />,
    )

    const nameInput = screen.getByRole('textbox', { name: 'Project name for Edge Console' })
    fireEvent.change(nameInput, { target: { value: 'Console' } })
    fireEvent.blur(nameInput)

    expect(screen.getByTestId('settings-project-row-edge-console')).toBeInTheDocument()
    expect(onUpdateProjectIdentity).toHaveBeenCalledWith(project.path, { label: 'Console' })
    expect(screen.getByText('/projects/edge-console')).toBeInTheDocument()
  })
})
