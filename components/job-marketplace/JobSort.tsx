"use client"

import React from 'react'
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

interface JobSortProps {
  value?: JobSortOption
  onSortChange: (sort: JobSortOption) => void
  className?: string
}

const sortOptions: { value: JobSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'highest_wage', label: 'Highest Wage' },
  { value: 'lowest_wage', label: 'Lowest Wage' },
  { value: 'nearest', label: 'Nearest' },
]

export function JobSort({ value = 'newest', onSortChange, className }: JobSortProps) {
  const handleSortChange = (newValue: string) => {
    onSortChange(newValue as JobSortOption)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by..." />
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
