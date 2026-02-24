"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/hooks"

export interface WorkerNotesDialogProps {
  bookingId: string
  workerName: string
  existingNotes?: string
  onSave: (bookingId: string, notes: string) => Promise<void> | void
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkerNotesDialog({
  bookingId,
  workerName,
  existingNotes = "",
  onSave,
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: WorkerNotesDialogProps) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [notes, setNotes] = React.useState(existingNotes)
  const [isSaving, setIsSaving] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }

      // Reset notes when dialog closes
      if (!newOpen) {
        setNotes(existingNotes)
      }
    },
    [isControlled, onOpenChange, existingNotes]
  )

  React.useEffect(() => {
    setNotes(existingNotes)
  }, [existingNotes])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(bookingId, notes.trim())
      handleOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNotes(existingNotes)
    handleOpenChange(false)
  }

  // Get character count text with pluralization
  const getCharacterCountText = (count: number) => {
    return t(count === 1 ? 'bookings.characterCount' : 'bookings.characterCount_plural', { count })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild className={triggerClassName}>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('bookings.workerNotes')}</DialogTitle>
          <DialogDescription>
            {t('bookings.workerNotesDescription', { workerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">{t('common.notes')}</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('bookings.workerNotesDetailedPlaceholder')}
              className={cn(
                "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
              )}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              {getCharacterCountText(notes.length)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || notes.trim() === existingNotes.trim()}
          >
            {isSaving ? t('common.saving') : t('bookings.saveNotes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
