"use client"

import { useOnlineStatus } from "@/lib/hooks/use-online-status"
import { WifiOff, Wifi, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PWAOfflineBanner() {
  const { isOnline } = useOnlineStatus()

  // Don't show banner when online
  if (isOnline) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "animate-in slide-in-from-top-full duration-300",
        "bg-destructive/95 backdrop-blur-sm border-b border-destructive/20",
        "p-3 sm:p-4"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <WifiOff className="h-5 w-5 text-destructive-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive-foreground">
              Anda sedang offline
            </p>
            <p className="text-xs text-destructive-foreground/80 mt-0.5">
              Beberapa fitur mungkin tidak tersedia. Periksa koneksi internet Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
