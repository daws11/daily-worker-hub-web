"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

type UseOnlineStatusOptions = {
  showToast?: boolean
  onlineMessage?: string
  offlineMessage?: string
  autoDetect?: boolean
}

type UseOnlineStatusReturn = {
  isOnline: boolean
  wasOffline: boolean
  checkStatus: () => boolean
}

export function useOnlineStatus(options: UseOnlineStatusOptions = {}): UseOnlineStatusReturn {
  const {
    showToast = false,
    onlineMessage = "Koneksi internet tersambung kembali",
    offlineMessage = "Koneksi internet terputus",
    autoDetect = true,
  } = options

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== "undefined" ? navigator.onLine : true
  )
  const [wasOffline, setWasOffline] = useState<boolean>(
    typeof window !== "undefined" ? !navigator.onLine : false
  )

  const checkStatus = useCallback((): boolean => {
    const status = typeof window !== "undefined" ? navigator.onLine : true
    setIsOnline(status)

    if (!status) {
      setWasOffline(true)
    }

    return status
  }, [])

  // Handle online event
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (showToast && wasOffline) {
        toast.success(onlineMessage)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      if (showToast) {
        toast.error(offlineMessage)
      }
    }

    if (autoDetect && typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)

      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [showToast, onlineMessage, offlineMessage, wasOffline, autoDetect])

  return {
    isOnline,
    wasOffline,
    checkStatus,
  }
}
