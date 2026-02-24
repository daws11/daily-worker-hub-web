"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

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

export interface WorkerCancellationDialogProps {
  bookingId: string
  workerName: string
  onCancel: (bookingId: string, notes: string) => Promise<void> | void
  trigger?: React.ReactNode
  triggerClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkerCancellationDialog({
  bookingId,
  workerName,
  onCancel,
  trigger,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: WorkerCancellationDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [notes, setNotes] = React.useState("")
  const [isCancelling, setIsCancelling] = React.useState(false)

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
        setNotes("")
      }
    },
    [isControlled, onOpenChange]
  )

  const handleCancel = async () => {
    if (notes.trim().length === 0) {
      return
    }

    setIsCancelling(true)
    try {
      await onCancel(bookingId, notes.trim())
      handleOpenChange(false)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleDismiss = () => {
    setNotes("")
    handleOpenChange(false)
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the booking with {workerName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-notes">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="cancellation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please provide a reason for cancelling this booking (e.g., emergency, schedule conflict, worker no longer needed...)"
              className={cn(
                "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
                "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30"
              )}
              disabled={isCancelling}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length} character{notes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            disabled={isCancelling}
          >
            Keep Booking
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling || notes.trim().length === 0}
          >
            {isCancelling ? "Cancelling..." : "Cancel Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
