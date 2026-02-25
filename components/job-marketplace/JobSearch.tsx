"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/hooks'

interface JobSearchProps {
  value?: string
  onSearchChange: (search: string) => void
  className?: string
  placeholder?: string
}

export function JobSearch({
  value = '',
  onSearchChange,
  className,
  placeholder
}: JobSearchProps) {
  const { t } = useTranslation()

  const searchPlaceholder = placeholder || t('jobs.searchPlaceholder')
  const [localSearch, setLocalSearch] = useState<string>(value)

  const hasSearchValue = Boolean(localSearch.trim())

  const handleSearchChange = (newValue: string) => {
    setLocalSearch(newValue)
    onSearchChange(newValue)
  }

  const handleClearSearch = () => {
    setLocalSearch('')
    onSearchChange('')
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 pr-10"
        />
        {hasSearchValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">{t('common.clear')}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
