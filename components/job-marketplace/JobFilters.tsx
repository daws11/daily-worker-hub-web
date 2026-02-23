"use client"

import React, { useState } from 'react'
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
import { WageRangeSlider } from '@/components/job-marketplace/WageRangeSlider'
import { JobFilters as JobFiltersType, PositionType } from '@/lib/types/job'
import { X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobFiltersProps {
  filters?: JobFiltersType
  onFiltersChange: (filters: JobFiltersType) => void
  className?: string
}

const positionTypes: { value: PositionType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
]

export function JobFilters({ filters, onFiltersChange, className }: JobFiltersProps) {
  const [localFilters, setLocalFilters] = useState<JobFiltersType>(filters || {})
  const [deadlineAfter, setDeadlineAfter] = useState<string>(filters?.deadlineAfter || '')
  const [deadlineBefore, setDeadlineBefore] = useState<string>(filters?.deadlineBefore || '')

  const hasActiveFilters = Boolean(
    localFilters.positionType ||
    localFilters.area ||
    localFilters.wageMin ||
    localFilters.wageMax ||
    localFilters.deadlineAfter ||
    localFilters.deadlineBefore
  )

  const handlePositionChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      positionType: value === 'all' ? undefined : (value as PositionType),
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

  const handleWageRangeChange = (value: [number, number]) => {
    const [minWage, maxWage] = value
    const newFilters = {
      ...localFilters,
      wageMin: minWage,
      wageMax: maxWage,
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
        {/* Position Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="position-type" className="text-sm">
            Position Type
          </Label>
          <Select
            value={localFilters.positionType || 'all'}
            onValueChange={handlePositionChange}
          >
            <SelectTrigger id="position-type">
              <SelectValue placeholder="All positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All positions</SelectItem>
              {positionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
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
          <WageRangeSlider
            label="Wage Range"
            min={0}
            max={10000000}
            step={100000}
            value={
              localFilters.wageMin !== undefined && localFilters.wageMax !== undefined
                ? [localFilters.wageMin, localFilters.wageMax]
                : undefined
            }
            defaultValue={[0, 10000000]}
            onValueChange={handleWageRangeChange}
            currency="IDR"
          />
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
