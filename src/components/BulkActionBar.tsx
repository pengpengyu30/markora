import { memo } from 'react'
import { Trash, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface BulkActionBarProps {
  count: number
  isArchivedView?: boolean
  onOrganize?: () => void
  onArchive?: () => void
  onDelete: () => void
  onUnarchive?: () => void
  onClear: () => void
}

interface BulkActionButtonProps {
  ariaLabel: string
  children: React.ReactNode
  destructive?: boolean
  onClick?: () => void
  testId: string
}

function BulkActionButton({ ariaLabel, children, destructive = false, onClick, testId }: BulkActionButtonProps) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={destructive ? 'destructive' : 'ghost'}
      className={
        destructive
          ? 'h-8 w-8 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30'
          : 'h-8 w-8 rounded-lg bg-background/10 text-background hover:bg-background/20 focus-visible:ring-background/35 disabled:bg-background/5 disabled:text-background/35'
      }
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-testid={testId}
    >
      {children}
    </Button>
  )
}

function renderPrimaryActions(
  onDelete: () => void,
) {
  return (
    <>
      <BulkActionButton ariaLabel="Permanently delete selected notes" destructive onClick={onDelete} testId="bulk-delete-btn">
        <Trash size={16} />
      </BulkActionButton>
    </>
  )
}

function BulkActionBarInner({ count, onDelete, onClear }: BulkActionBarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between"
      style={{
        height: 44,
        padding: '0 12px',
        background: 'var(--foreground)',
        color: 'var(--background)',
      }}
      data-testid="bulk-action-bar"
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>
        {count} selected
      </span>
      <div className="flex items-center gap-1.5">
        {renderPrimaryActions(onDelete)}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 rounded-lg text-background/55 hover:bg-background/10 hover:text-background focus-visible:ring-background/30"
          onClick={onClear}
          aria-label="Clear selection"
          title="Clear selection"
          data-testid="bulk-clear-btn"
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  )
}

export const BulkActionBar = memo(BulkActionBarInner)
