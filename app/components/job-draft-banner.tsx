"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface JobDraftBannerProps {
  className?: string
  onRestore?: () => void
  onDiscard?: () => void
  timestamp?: number
}

export function JobDraftBanner({
  className,
  onRestore,
  onDiscard,
  timestamp,
}: JobDraftBannerProps) {
  const formatTimeAgo = (ts: number): string => {
    const seconds = Math.floor((Date.now() - ts) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? "s" : ""} ago`
  }

  return (
    <div
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            You have unsaved changes
            {timestamp && (
              <span className="ml-2 text-amber-700 dark:text-amber-300 font-normal">
                (saved {formatTimeAgo(timestamp)})
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Your progress has been saved. You can restore it or discard to start fresh.
          </p>
        </div>
        <div className="flex gap-2 sm:self-end">
          {onDiscard && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              className="text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900"
            >
              Discard
            </Button>
          )}
          {onRestore && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onRestore}
              className="bg-amber-900 text-amber-50 hover:bg-amber-800 dark:bg-amber-100 dark:text-amber-900 dark:hover:bg-amber-200"
            >
              Restore Draft
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
