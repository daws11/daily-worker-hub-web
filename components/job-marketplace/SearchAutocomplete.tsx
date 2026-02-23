"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, MapPin, Briefcase, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSearchSuggestions, SearchSuggestion } from '@/lib/api/autocomplete'

interface SearchAutocompleteProps {
  value?: string
  onSearchChange: (search: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  className?: string
  placeholder?: string
  debounceMs?: number
}

export function SearchAutocomplete({
  value = '',
  onSearchChange,
  onSuggestionSelect,
  className,
  placeholder = 'Search jobs by position or area...',
  debounceMs = 300
}: SearchAutocompleteProps) {
  const [localSearch, setLocalSearch] = useState<string>(value)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const hasSearchValue = Boolean(localSearch.trim())

  const handleSearchChange = (newValue: string) => {
    setLocalSearch(newValue)
    onSearchChange(newValue)
    setSelectedIndex(-1)

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Don't fetch suggestions if input is empty
    if (!newValue.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue.trim())
    }, debounceMs)
  }

  const fetchSuggestions = async (query: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await getSearchSuggestions({ query, limit: 8 })
      if (error) {
        setSuggestions([])
      } else if (data) {
        setSuggestions(data)
        setShowSuggestions(true)
      }
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    onSearchChange('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setLocalSearch(suggestion.name)
    onSearchChange(suggestion.name)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Update local state when value prop changes
  useEffect(() => {
    setLocalSearch(value)
  }, [value])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {hasSearchValue && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-[300px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="p-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-8 text-sm outline-none transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  selectedIndex === index && 'bg-accent text-accent-foreground'
                )}
              >
                {suggestion.type === 'position' ? (
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 text-left truncate">{suggestion.name}</span>
                {suggestion.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {suggestion.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
