import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  Dialog,
  DialogContent,
} from './dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'

describe('dismissable Escape surfaces', () => {
  it('lets a Dialog close before Escape reaches the window', () => {
    const onOpenChange = vi.fn()
    const windowKeyDown = vi.fn()
    window.addEventListener('keydown', windowKeyDown)

    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-content">Dialog</DialogContent>
      </Dialog>,
    )

    fireEvent.keyDown(screen.getByTestId('dialog-content'), { key: 'Escape' })

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(windowKeyDown).not.toHaveBeenCalled()
    window.removeEventListener('keydown', windowKeyDown)
  })

  it('lets a Popover close before Escape reaches the window', () => {
    const onOpenChange = vi.fn()
    const windowKeyDown = vi.fn()
    window.addEventListener('keydown', windowKeyDown)

    render(
      <Popover open onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button">Open</button>
        </PopoverTrigger>
        <PopoverContent data-testid="popover-content">Popover</PopoverContent>
      </Popover>,
    )

    fireEvent.keyDown(screen.getByTestId('popover-content'), { key: 'Escape' })

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(windowKeyDown).not.toHaveBeenCalled()
    window.removeEventListener('keydown', windowKeyDown)
  })
})
