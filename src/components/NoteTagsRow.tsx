import { useMemo, useState, type CSSProperties } from 'react'
import { Check, Plus, Tag, X } from '@phosphor-icons/react'
import { translate, type AppLocale } from '../lib/i18n'
import {
  getTagInputError,
  getTagColorVariant,
  normalizeTagDraft,
  normalizeTagInput,
  type TagCount,
} from '../utils/noteTags'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

interface NoteTagsRowProps {
  tags: string[]
  locale: AppLocale
  onRemoveTag: (tag: string) => void
}

const TAG_ACCENTS = {
  blue: '#3b82f6',
  amber: '#d97706',
  green: '#22a06b',
  violet: '#8b5cf6',
  rose: '#e05275',
  teal: '#0d9488',
} as const

function tagChipStyle(tag: string): CSSProperties {
  const accent = TAG_ACCENTS[getTagColorVariant(tag)]
  return {
    backgroundColor: `color-mix(in srgb, ${accent} 17%, transparent)`,
    borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
    color: `color-mix(in srgb, ${accent} 76%, var(--foreground))`,
  }
}

export function TagChip({
  tag,
  locale,
  onRemove,
  testId,
}: {
  tag: string
  locale: AppLocale
  onRemove?: (tag: string) => void
  testId?: string
}) {
  return (
    <Badge
      data-testid={testId}
      data-tag-color={getTagColorVariant(tag)}
      variant="outline"
      className="tag-chip max-w-28 min-w-0 gap-0.5 px-1.5 py-0.5 font-normal"
      style={tagChipStyle(tag)}
    >
      <span className="min-w-0 truncate" title={tag}>{tag}</span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="!h-4 !w-4 !min-w-0 !shrink-0 !rounded-full !p-0 text-current opacity-70 hover:bg-transparent hover:text-current hover:opacity-100"
          aria-label={translate(locale, 'editor.tags.remove', { tag })}
          onClick={() => onRemove(tag)}
        >
          <X size={12} />
        </Button>
      )}
    </Badge>
  )
}

export interface NoteTagsPickerProps {
  tags: string[]
  availableTags: TagCount[]
  locale: AppLocale
  onAddTag: (tag: string) => void
  triggerTestId?: string
  triggerVariant?: 'icon' | 'inline'
}

function tagMatchesQuery(tag: TagCount, query: string): boolean {
  return query.length === 0 || tag.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
}

export function NoteTagsRow({ tags, locale, onRemoveTag }: NoteTagsRowProps) {
  if (tags.length === 0) return null

  return (
    <div data-testid="note-tag-row" className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {tags.map((tag) => (
        <TagChip
          key={tag}
          tag={tag}
          locale={locale}
          onRemove={onRemoveTag}
          testId="note-tag-chip"
        />
      ))}
    </div>
  )
}

export function NoteTagsPicker({
  tags,
  availableTags,
  locale,
  onAddTag,
  triggerTestId = 'note-tag-add',
  triggerVariant = 'icon',
}: NoteTagsPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const normalizedDraft = normalizeTagDraft(query)
  const normalizedQuery = normalizeTagInput(query)
  const inputError = getTagInputError(query)
  const currentTags = useMemo(() => new Set(tags), [tags])
  const availableOptions = useMemo(
    () => availableTags.filter((tag) => !currentTags.has(tag.name) && tagMatchesQuery(tag, normalizedDraft)),
    [availableTags, currentTags, normalizedDraft],
  )
  const exactOption = normalizedQuery
    ? availableTags.find((tag) => tag.name === normalizedQuery)
    : undefined
  const creatableTag = normalizedQuery && !currentTags.has(normalizedQuery) && !exactOption
    ? normalizedQuery
    : null
  const addLabel = translate(locale, 'editor.tags.add')

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }

  const handleAdd = (tag: string) => {
    onAddTag(tag)
    setOpen(false)
    setQuery('')
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size={triggerVariant === 'inline' ? 'sm' : 'icon-xs'}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        triggerVariant === 'inline'
          ? 'h-5 gap-1 px-1.5 text-xs font-normal [&_svg:not([class*=size-])]:size-3'
          : '[&_svg:not([class*=size-])]:size-4',
      )}
      aria-expanded={open}
      aria-label={addLabel}
      title={addLabel}
      data-testid={triggerTestId}
      onClick={triggerVariant === 'inline' ? () => handleOpenChange(!open) : undefined}
    >
      {triggerVariant === 'inline'
        ? <><Plus size={12} /><span>{addLabel}</span></>
        : <Tag size={16} />}
    </Button>
  )
  const pickerBody = (
    <>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value.toLowerCase())}
          placeholder={translate(locale, 'editor.tags.inputPlaceholder')}
          aria-label={translate(locale, 'editor.tags.addLabel')}
          className="h-8 text-xs"
        />
        {inputError && (
          <p role="alert" data-testid="note-tag-validation" className="px-2 pt-1.5 text-xs text-destructive">
            {translate(locale, inputError === 'tooLong' ? 'editor.tags.validation.tooLong' : 'editor.tags.validation.invalid')}
          </p>
        )}
        <div className="mt-1 max-h-52 overflow-y-auto" role="listbox" aria-label={translate(locale, 'editor.tags.addLabel')}>
          {availableOptions.map((option) => (
            <Button
              key={option.name}
              type="button"
              variant="ghost"
              data-testid="note-tag-option"
              className="h-8 w-full justify-between px-2 text-xs font-normal"
              onClick={() => handleAdd(option.name)}
            >
              <span className="truncate">{option.name}</span>
              <span className="ml-2 shrink-0 text-muted-foreground">
                {translate(locale, 'editor.tags.usage', { count: option.count })}
              </span>
            </Button>
          ))}
          {creatableTag && (
            <Button
              type="button"
              variant="ghost"
              data-testid="note-tag-create"
              className={cn('h-8 w-full justify-start px-2 text-xs font-normal')}
              onClick={() => handleAdd(creatableTag)}
            >
              <Check size={14} className="mr-1.5" />
              {translate(locale, 'editor.tags.create', { tag: creatableTag })}
            </Button>
          )}
          {availableOptions.length === 0 && !creatableTag && !inputError && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{translate(locale, 'editor.tags.noMatches')}</p>
          )}
        </div>
    </>
  )

  if (triggerVariant === 'inline') {
    return (
      <div className="relative">
        {trigger}
        {open && (
          <div
            role="dialog"
            className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md"
            data-testid="note-tag-combobox"
          >
            {pickerBody}
          </div>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2" data-testid="note-tag-combobox">
        {pickerBody}
      </PopoverContent>
    </Popover>
  )
}

export function NoteTagsPropertyRow({
  tags,
  availableTags,
  locale,
  onAddTag,
  onRemoveTag,
}: NoteTagsRowProps & Pick<NoteTagsPickerProps, 'availableTags' | 'onAddTag'>) {
  return (
    <div data-testid="note-tags-property-row" className="flex min-w-0 items-start gap-2 py-1">
      <span className="w-12 shrink-0 pt-1 text-[11px] font-medium text-muted-foreground">
        {translate(locale, 'sidebar.group.tags')}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <NoteTagsRow tags={tags} locale={locale} onRemoveTag={onRemoveTag} />
        <NoteTagsPicker
          tags={tags}
          availableTags={availableTags}
          locale={locale}
          onAddTag={onAddTag}
          triggerTestId="note-tag-property-add"
          triggerVariant="inline"
        />
      </div>
    </div>
  )
}
