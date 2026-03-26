'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Label } from '@/components/ui/label'

interface TagInputProps {
  id: string
  label: string
  placeholder?: string
  initialValues?: string[] | null
  onChange: (values: string[]) => void
}

export function TagInput({ id, label, placeholder, initialValues, onChange }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialValues ?? [])
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(value: string) {
    const trimmed = value.trim()
    if (!trimmed || tags.includes(trimmed)) return
    const updated = [...tags, trimmed]
    setTags(updated)
    onChange(updated)
    setInputValue('')
  }

  function removeTag(index: number) {
    const updated = tags.filter((_, i) => i !== index)
    setTags(updated)
    onChange(updated)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div
        className="flex min-h-10 w-full flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i) }}
              className="text-muted-foreground hover:text-foreground leading-none"
              aria-label={`Remover ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-30 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">Enter ou vírgula para adicionar</p>
    </div>
  )
}
