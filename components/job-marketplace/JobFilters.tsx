"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JobFilters as JobFiltersType } from '@/lib/types/job'
import { X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobFiltersProps {
  filters?: JobFiltersType
  onFiltersChange: (filters: JobFiltersType) => void
  className?: string
}

// Categories that match our database
const categories = [
  { value: 'cat-1', label: 'Housekeeping' },
  { value: 'cat-2', label: 'Driving' },
  { value: 'cat-3', label: 'Cooking' },
  { value: 'cat-4', label: 'Gardening' },
  { value: 'cat-5', label: 'Construction' },
  { value: 'cat-6', label: 'Security' },
]

export function JobFilters({ filters, onFiltersChange, className }: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobFiltersType>(filters || {})
  const [wageMin, setWageMin] = useState<string>(filters?.wageMin?.toString() || '')
  const [wageMax, setWageMax] = useState<string>(filters?.wageMax?.toString() || '')
  const [deadlineAfter, setDeadlineAfter] = useState<string>(filters?.deadlineAfter || '')
  const [deadlineBefore, setDeadlineBefore] = useState<string>(filters?.deadlineBefore || '')

  // Sync local state when filters prop changes
  useEffect(() => {
    setLocalFilters(filters || {})
    setWageMin(filters?.wageMin?.toString() || '')
    setWageMax(filters?.wageMax?.toString() || '')
    setDeadlineAfter(filters?.deadlineAfter || '')
    setDeadlineBefore(filters?.deadlineBefore || '')
  }, [filters])

  const hasActiveFilters = Boolean(
    localFilters.categoryId ||
    localFilters.area ||
    localFilters.wageMin ||
    localFilters.wageMax ||
    localFilters.deadlineAfter ||
    localFilters.deadlineBefore
  )

  const handleCategoryChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      categoryId: value === 'all' ? undefined : value,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleAreaChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      area: value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleWageMinChange = (value: string) => {
    setWageMin(value)
    const numValue = value ? parseInt(value, 10) : undefined
    const newFilters = {
      ...localFilters,
      wageMin: numValue,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleWageMaxChange = (value: string) => {
    setWageMax(value)
    const numValue = value ? parseInt(value, 10) : undefined
    const newFilters = {
      ...localFilters,
      wageMax: numValue,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDeadlineAfterChange = (value: string) => {
    setDeadlineAfter(value)
    const newFilters = {
      ...localFilters,
      deadlineAfter: value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDeadlineBeforeChange = (value: string) => {
    setDeadlineBefore(value)
    const newFilters = {
      ...localFilters,
      deadlineBefore: value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters: JobFiltersType = {}
    setLocalFilters(clearedFilters)
    setWageMin('')
    setWageMax('')
    setDeadlineAfter('')
    setDeadlineBefore('')
    onFiltersChange(clearedFilters)
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm">
            Category
          </Label>
          <Select
            value={localFilters.categoryId || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area Filter */}
        <div className="space-y-2">
          <Label htmlFor="area" className="text-sm">
            Area / Location
          </Label>
          <Input
            id="area"
            type="text"
            placeholder="e.g. Kuta, Seminyak"
            value={localFilters.area || ''}
            onChange={(e) => handleAreaChange(e.target.value)}
          />
        </div>

        {/* Wage Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Wage Range (IDR)</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Min"
                min="0"
                value={wageMin}
                onChange={(e) => handleWageMinChange(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Max"
                min="0"
                value={wageMax}
                onChange={(e) => handleWageMaxChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Deadline Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Deadline</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="deadline-after" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="deadline-after"
                type="date"
                value={deadlineAfter}
                onChange={(e) => handleDeadlineAfterChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadline-before" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="deadline-before"
                type="date"
                value={deadlineBefore}
                onChange={(e) => handleDeadlineBeforeChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
