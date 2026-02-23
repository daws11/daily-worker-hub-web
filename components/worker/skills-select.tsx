"use client"

import * as React from "react"
import { Controller, type ControllerProps } from "react-hook-form"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Skill {
  id: string
  name: string
  slug: string
}

interface SkillsSelectProps {
  skills: Skill[]
  selectedSkills: string[]
  onSkillsChange: (skillIds: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SkillsSelect({
  skills,
  selectedSkills,
  onSkillsChange,
  placeholder = "Select skills...",
  disabled = false,
  className,
}: SkillsSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const selectedSkillsMap = React.useMemo(
    () => new Set(selectedSkills),
    [selectedSkills]
  )

  const availableSkills = React.useMemo(
    () => skills.filter((skill) => !selectedSkillsMap.has(skill.id)),
    [skills, selectedSkillsMap]
  )

  const handleSelectSkill = (skillId: string) => {
    onSkillsChange([...selectedSkills, skillId])
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleRemoveSkill = (skillId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSkillsChange(selectedSkills.filter((id) => id !== skillId))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        disabled={disabled || availableSkills.length === 0}
        value=""
        onValueChange={handleSelectSkill}
      >
        <SelectTrigger ref={triggerRef}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableSkills.length === 0 ? (
            <div className="py-1.5 px-2 text-sm text-muted-foreground">
              No more skills available
            </div>
          ) : (
            availableSkills.map((skill) => (
              <SelectItem key={skill.id} value={skill.id}>
                {skill.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSkills.map((skillId) => {
            const skill = skills.find((s) => s.id === skillId)
            if (!skill) return null

            return (
              <Badge
                key={skill.id}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {skill.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSkill(skill.id, e)}
                    className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                    aria-label={`Remove ${skill.name}`}
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

interface FormSkillsSelectProps<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  skills: Skill[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

function FormSkillsSelectInner<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  field,
  skills,
  placeholder,
  disabled,
  className,
}: Pick<FormSkillsSelectProps<TFieldValues, TName>, "skills" | "placeholder" | "disabled" | "className"> & {
  field: { value: string[]; onChange: (value: string[]) => void }
}) {
  return (
    <SkillsSelect
      skills={skills}
      selectedSkills={field.value || []}
      onSkillsChange={field.onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}

import type { FieldPath } from "react-hook-form"

export function FormSkillsSelect<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  skills,
  placeholder,
  disabled,
  className,
}: Omit<ControllerProps<TFieldValues, TName>, "render"> &
  Pick<FormSkillsSelectProps<TFieldValues, TName>, "skills" | "placeholder" | "disabled" | "className">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormSkillsSelectInner
          field={field}
          skills={skills}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
      )}
    />
  )
}
