"use client"

import * as React from "react"
import { Controller, type ControllerProps } from "react-hook-form"
import { Upload, X, Image as ImageIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]

export interface FileUploadValue {
  file: File | null
  preview: string | null
}

interface FileUploadProps {
  value: FileUploadValue | null
  onChange: (value: FileUploadValue) => void
  label: string
  description?: string
  accept?: string
  disabled?: boolean
  className?: string
  error?: string
}

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Format file harus ${ALLOWED_EXTENSIONS.join(", ")}`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file maksimal 5MB`,
    }
  }

  return { valid: true }
}

function createPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function FileUpload({
  value,
  onChange,
  label,
  description,
  accept = ".jpg,.jpeg,.png,.webp",
  disabled = false,
  className,
  error,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dropZoneRef = React.useRef<HTMLDivElement>(null)

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
      onChange({ file: null, preview: null })
      return
    }

    const validation = validateFile(selectedFile)
    if (!validation.valid) {
      // Set error will be handled by parent through the error prop
      // For now, we don't update the value if invalid
      return
    }

    try {
      const preview = await createPreview(selectedFile)
      onChange({ file: selectedFile, preview })
    } catch {
      // If preview fails, still set the file but without preview
      onChange({ file: selectedFile, preview: null })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null
    handleFileSelect(selectedFile)
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleRemove = () => {
    if (!disabled) {
      onChange({ file: null, preview: null })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleButtonClick()
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-label={`Upload ${label}`}
      />

      {!value?.file ? (
        <div
          ref={dropZoneRef}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleButtonClick}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isDragging && "border-primary bg-primary/5",
            disabled && "cursor-not-allowed opacity-50",
            !disabled && !isDragging && "hover:border-primary/50 cursor-pointer",
            error && "border-destructive",
            !error && "border-input"
          )}
        >
          <div
            className={cn(
              "rounded-full p-3",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{label}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              atau drag and drop
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              handleButtonClick()
            }}
          >
            Pilih File
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-input bg-muted/50",
            disabled && "opacity-50"
          )}
        >
          <div className="flex items-start gap-4 p-4">
            {/* Image Preview */}
            {value.preview ? (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border bg-background">
                <img
                  src={value.preview}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* File Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="text-sm font-medium truncate">{value.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(value.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* Remove Button */}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="flex-shrink-0"
                aria-label={`Remove ${label}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Form integration component
interface FormFileUploadProps<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  label: string
  description?: string
  accept?: string
  disabled?: boolean
  className?: string
}

import type { FieldPath } from "react-hook-form"

export function FormFileUpload<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  accept,
  disabled,
  className,
}: Omit<ControllerProps<TFieldValues, TName>, "render"> &
  Pick<FormFileUploadProps<TFieldValues, TName>, "label" | "description" | "accept" | "disabled" | "className">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FileUpload
          value={field.value}
          onChange={field.onChange}
          label={label}
          description={description}
          accept={accept}
          disabled={disabled}
          className={className}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}
