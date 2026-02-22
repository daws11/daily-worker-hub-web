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
import { TransactionFilters as TransactionFiltersType, WalletTransactionType } from '@/lib/types/wallet'
import { X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TransactionFiltersProps {
  filters?: TransactionFiltersType
  onFiltersChange: (filters: TransactionFiltersType) => void
  className?: string
}

const transactionTypes: { value: WalletTransactionType; label: string }[] = [
  { value: 'credit', label: 'Pemasukan' },
  { value: 'debit', label: 'Pengeluaran' },
  { value: 'pending', label: 'Tertahan' },
  { value: 'released', label: 'Diterbitkan' },
]

export function TransactionFilters({ filters, onFiltersChange, className }: TransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState<TransactionFiltersType>(filters || {})
  const [amountMin, setAmountMin] = useState<string>(filters?.amountMin?.toString() || '')
  const [amountMax, setAmountMax] = useState<string>(filters?.amountMax?.toString() || '')
  const [dateAfter, setDateAfter] = useState<string>(filters?.dateAfter || '')
  const [dateBefore, setDateBefore] = useState<string>(filters?.dateBefore || '')

  const hasActiveFilters = Boolean(
    localFilters.type ||
    localFilters.amountMin ||
    localFilters.amountMax ||
    localFilters.dateAfter ||
    localFilters.dateBefore
  )

  const handleTypeChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      type: value === 'all' ? undefined : (value as WalletTransactionType),
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleAmountMinChange = (value: string) => {
    setAmountMin(value)
    const numValue = value ? parseInt(value, 10) : undefined
    const newFilters = {
      ...localFilters,
      amountMin: numValue,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleAmountMaxChange = (value: string) => {
    setAmountMax(value)
    const numValue = value ? parseInt(value, 10) : undefined
    const newFilters = {
      ...localFilters,
      amountMax: numValue,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDateAfterChange = (value: string) => {
    setDateAfter(value)
    const newFilters = {
      ...localFilters,
      dateAfter: value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDateBeforeChange = (value: string) => {
    setDateBefore(value)
    const newFilters = {
      ...localFilters,
      dateBefore: value || undefined,
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters: TransactionFiltersType = {}
    setLocalFilters(clearedFilters)
    setAmountMin('')
    setAmountMax('')
    setDateAfter('')
    setDateBefore('')
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
        {/* Transaction Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="transaction-type" className="text-sm">
            Transaction Type
          </Label>
          <Select
            value={localFilters.type || 'all'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="transaction-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {transactionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Amount Range (IDR)</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Min"
                min="0"
                value={amountMin}
                onChange={(e) => handleAmountMinChange(e.target.value)}
              />
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Max"
                min="0"
                value={amountMax}
                onChange={(e) => handleAmountMaxChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Transaction Date</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="date-after" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="date-after"
                type="date"
                value={dateAfter}
                onChange={(e) => handleDateAfterChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-before" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="date-before"
                type="date"
                value={dateBefore}
                onChange={(e) => handleDateBeforeChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
