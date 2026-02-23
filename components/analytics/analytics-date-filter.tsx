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
import { DateRange, DateRangePreset } from '@/lib/types/analytics'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalyticsDateFilterProps {
  dateRange?: DateRange
  onDateRangeChange: (dateRange: DateRange) => void
  className?: string
}

type SelectedPreset = DateRangePreset | 'custom'

const dateRangePresets: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7 Hari Terakhir' },
  { value: '30d', label: '30 Hari Terakhir' },
  { value: '90d', label: '90 Hari Terakhir' },
  { value: '6m', label: '6 Bulan Terakhir' },
  { value: '1y', label: '1 Tahun Terakhir' },
  { value: 'all', label: 'Semua Waktu' },
]

function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let from: Date

  switch (preset) {
    case '7d':
      from = new Date(today)
      from.setDate(from.getDate() - 7)
      break
    case '30d':
      from = new Date(today)
      from.setDate(from.getDate() - 30)
      break
    case '90d':
      from = new Date(today)
      from.setDate(from.getDate() - 90)
      break
    case '6m':
      from = new Date(today)
      from.setMonth(from.getMonth() - 6)
      break
    case '1y':
      from = new Date(today)
      from.setFullYear(from.getFullYear() - 1)
      break
    case 'all':
    default:
      from = new Date(2020, 0, 1) // Default start date for "all time"
      break
  }

  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
    preset,
  }
}

export function AnalyticsDateFilter({ dateRange, onDateRangeChange, className }: AnalyticsDateFilterProps) {
  const [localDateRange, setLocalDateRange] = useState<DateRange>(
    dateRange || getDateRangeFromPreset('30d')
  )
  const [fromDate, setFromDate] = useState<string>(
    localDateRange.from
  )
  const [toDate, setToDate] = useState<string>(
    localDateRange.to
  )
  const [selectedPreset, setSelectedPreset] = useState<SelectedPreset>(
    localDateRange.preset || '30d'
  )

  // Update local state when dateRange prop changes
  useEffect(() => {
    if (dateRange) {
      setLocalDateRange(dateRange)
      setFromDate(dateRange.from)
      setToDate(dateRange.to)
      if (dateRange.preset) {
        setSelectedPreset(dateRange.preset)
      } else {
        setSelectedPreset('custom')
      }
    }
  }, [dateRange])

  const handlePresetChange = (value: string) => {
    const preset = value as DateRangePreset
    setSelectedPreset(preset)
    const newDateRange = getDateRangeFromPreset(preset)
    setLocalDateRange(newDateRange)
    setFromDate(newDateRange.from)
    setToDate(newDateRange.to)
    onDateRangeChange(newDateRange)
  }

  const handleFromDateChange = (value: string) => {
    setFromDate(value)
    const newDateRange: DateRange = {
      ...localDateRange,
      from: value,
      preset: undefined,
    }
    setLocalDateRange(newDateRange)
    setSelectedPreset('custom')
    onDateRangeChange(newDateRange)
  }

  const handleToDateChange = (value: string) => {
    setToDate(value)
    const newDateRange: DateRange = {
      ...localDateRange,
      to: value,
      preset: undefined,
    }
    setLocalDateRange(newDateRange)
    setSelectedPreset('custom')
    onDateRangeChange(newDateRange)
  }

  const handleClearDates = () => {
    const clearedDateRange = getDateRangeFromPreset('all')
    setLocalDateRange(clearedDateRange)
    setFromDate(clearedDateRange.from)
    setToDate(clearedDateRange.to)
    setSelectedPreset('all')
    onDateRangeChange(clearedDateRange)
  }

  const hasCustomDates = selectedPreset === 'custom' || (localDateRange.preset === undefined)

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filter Tanggal
          </CardTitle>
          {hasCustomDates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDates}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preset Selection */}
        <div className="space-y-2">
          <Label htmlFor="date-preset" className="text-sm">
            Periode
          </Label>
          <Select
            value={selectedPreset === 'custom' ? 'custom' : selectedPreset}
            onValueChange={handlePresetChange}
          >
            <SelectTrigger id="date-preset">
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              {dateRangePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        <div className="space-y-2">
          <Label className="text-sm">Rentang Tanggal Kustom</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                Dari
              </Label>
              <Input
                id="date-from"
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                max={toDate}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                Sampai
              </Label>
              <Input
                id="date-to"
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                min={fromDate}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
