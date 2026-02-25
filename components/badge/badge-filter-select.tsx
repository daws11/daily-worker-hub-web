"use client"

import * as React from "react"
import { Controller, type ControllerProps } from "react-hook-form"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Badge as BadgeType } from "@/lib/types/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BadgeFilterSelectProps {
  badges: BadgeType[]
  selectedBadges: string[]
  onBadgesChange: (badgeIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BadgeFilterSelect({
  badges,
  selectedBadges,
  onBadgesChange,
  placeholder = "Filter by badges...",
  disabled = false,
  className,
}: BadgeFilterSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const selectedBadgesMap = React.useMemo(
    () => new Set(selectedBadges),
    [selectedBadges]
  )

  const availableBadges = React.useMemo(
    () => badges.filter((badge) => !selectedBadgesMap.has(badge.id)),
    [badges, selectedBadgesMap]
  )

  const handleSelectBadge = (badgeId: string) => {
    onBadgesChange([...selectedBadges, badgeId])
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleRemoveBadge = (badgeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onBadgesChange(selectedBadges.filter((id) => id !== badgeId))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        disabled={disabled || availableBadges.length === 0}
        value=""
        onValueChange={handleSelectBadge}
      >
        <SelectTrigger ref={triggerRef}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableBadges.length === 0 ? (
            <div className="py-1.5 px-2 text-sm text-muted-foreground">
              No more badges available
            </div>
          ) : (
            availableBadges.map((badge) => (
              <SelectItem key={badge.id} value={badge.id}>
                {badge.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedBadges.map((badgeId) => {
            const badge = badges.find((b) => b.id === badgeId)
            if (!badge) return null

            return (
              <Badge
                key={badge.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {badge.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveBadge(badge.id, e)}
                    className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    aria-label={`Remove ${badge.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface FormBadgeFilterSelectProps<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  badges: BadgeType[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

function FormBadgeFilterSelectInner<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  field,
  badges,
  placeholder,
  disabled,
  className,
}: Pick<FormBadgeFilterSelectProps<TFieldValues, TName>, "badges" | "placeholder" | "disabled" | "className"> & {
  field: { value: string[]; onChange: (value: string[]) => void }
}) {
  return (
    <BadgeFilterSelect
      badges={badges}
      selectedBadges={field.value || []}
      onBadgesChange={field.onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}

import type { FieldPath } from "react-hook-form"

export function FormBadgeFilterSelect<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  badges,
  placeholder,
  disabled,
  className,
}: Omit<ControllerProps<TFieldValues, TName>, "render"> &
  Pick<FormBadgeFilterSelectProps<TFieldValues, TName>, "badges" | "placeholder" | "disabled" | "className">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormBadgeFilterSelectInner
          field={field}
          badges={badges}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      )}
    />
  )
}
