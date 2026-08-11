import { useMemo, useState } from 'react'
import { Check, Tag, X } from '@phosphor-icons/react'
import { translate, type AppLocale } from '../lib/i18n'
import {
  getTagInputError,
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

export interface NoteTagsPickerProps {
  tags: string[]
  availableTags: TagCount[]
  locale: AppLocale
  onAddTag: (tag: string) => void
  triggerTestId?: string
}

function tagMatchesQuery(tag: TagCount, query: string): boolean {
  return query.length === 0 || tag.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
}

export function NoteTagsRow({ tags, locale, onRemoveTag }: NoteTagsRowProps) {
  if (tags.length === 0) return null

  return (
    <div data-testid="note-tag-row" className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {tags.map((tag) => (
        <Badge
          key={tag}
          data-testid="note-tag-chip"
          variant="secondary"
          className="max-w-28 min-w-0 gap-0.5 px-1.5 py-0.5 font-normal"
        >
          <span className="min-w-0 truncate" title={tag}>{tag}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="!h-4 !w-4 !min-w-0 !shrink-0 !rounded-full !p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label={translate(locale, 'editor.tags.remove', { tag })}
            onClick={() => onRemoveTag(tag)}
          >
            <X size={12} />
          </Button>
        </Badge>
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground [&_svg:not([class*=size-])]:size-4"
          aria-label={addLabel}
          title={addLabel}
          data-testid={triggerTestId}
        >
          <Tag size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2" data-testid="note-tag-combobox">
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
      </PopoverContent>
    </Popover>
  )
}
