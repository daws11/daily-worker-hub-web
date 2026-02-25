"use client"

import React, { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JobSortOption } from '@/lib/types/job'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/hooks'

interface JobSortProps {
  value?: JobSortOption
  onSortChange: (sort: JobSortOption) => void
  className?: string
}

export function JobSort({ value = 'newest', onSortChange, className }: JobSortProps) {
  const { t } = useTranslation()

  const sortOptions: { value: JobSortOption; label: string }[] = useMemo(() => [
    { value: 'newest', label: t('jobs.sortNewest') },
    { value: 'oldest', label: t('jobs.sortOldest') },
    { value: 'highest_wage', label: t('jobs.sortWageHigh') },
    { value: 'lowest_wage', label: t('jobs.sortWageLow') },
    { value: 'nearest', label: t('jobs.sortDistance') },
  ], [t])
  const handleSortChange = (newValue: string) => {
    onSortChange(newValue as JobSortOption)
  }

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={value} onValueChange={handleSortChange}>
        <SelectTrigger className="w-full sm:w-[180px] min-w-0">
          <SelectValue placeholder={t('jobs.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
