import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppThemeScope } from './AppThemeScope'

describe('AppThemeScope', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.setAttribute('data-editor-theme', 'editorial')
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-editor-theme')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.removeProperty('--surface-app')
    document.documentElement.style.removeProperty('--primary')
  })

  it('makes the selected editor family available through projected app roles', () => {
    render(
      <AppThemeScope>
        <div data-testid="app-child" />
      </AppThemeScope>,
    )

    const scope = screen.getByTestId('app-theme-scope')
    expect(scope).toHaveAttribute('data-editor-theme', 'editorial')
    expect(scope).toHaveClass('app-theme-scope')
    expect(scope.style.getPropertyValue('--editor-theme-surfaces-canvas')).toBe('')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#FCF9F5')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#8F3D52')
  })
})
