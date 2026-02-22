"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import type { LocationCoordinates } from "../types/attendance"

type UseGeolocationOptions = {
  watch?: boolean
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  autoFetch?: boolean
}

type UseGeolocationReturn = {
  location: LocationCoordinates | null
  isLoading: boolean
  error: string | null
  permission: PermissionState | null
  getCurrentPosition: () => Promise<LocationCoordinates | null>
  clearWatch: () => void
  refreshLocation: () => Promise<void>
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    watch = false,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    autoFetch = true,
  } = options

  const [location, setLocation] = useState<LocationCoordinates | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permission, setPermission] = useState<PermissionState | null>(null)

  const watchIdRef = useRef<number | null>(null)

  const getCurrentPosition = useCallback(async (): Promise<LocationCoordinates | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const errorMessage = "Geolocation tidak didukung oleh browser ini"
        setError(errorMessage)
        toast.error(errorMessage)
        resolve(null)
        return
      }

      setIsLoading(true)
      setError(null)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: LocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setLocation(coords)
          setIsLoading(false)
          setError(null)
          resolve(coords)
        },
        (err) => {
          let errorMessage = "Gagal mengambil lokasi"

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Izin lokasi ditolak. Silakan aktifkan lokasi di pengaturan browser."
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia."
              break
            case err.TIMEOUT:
              errorMessage = "Waktu habis untuk mengambil lokasi."
              break
          }

          setError(errorMessage)
          setIsLoading(false)
          toast.error(errorMessage)
          resolve(null)
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      )
    })
  }, [enableHighAccuracy, timeout, maximumAge])

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const refreshLocation = useCallback(async () => {
    await getCurrentPosition()
  }, [getCurrentPosition])

  // Check permission state
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermission(result.state)

          result.addEventListener("change", () => {
            setPermission(result.state)
          })
        })
        .catch(() => {
          // Permission API not fully supported, silently ignore
        })
    }
  }, [])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      getCurrentPosition()
    }
  }, [autoFetch])

  // Watch position changes if watch mode is enabled
  useEffect(() => {
    if (watch) {
      if (!navigator.geolocation) {
        const errorMessage = "Geolocation tidak didukung oleh browser ini"
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: LocationCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setLocation(coords)
          setError(null)
          setIsLoading(false)
        },
        (err) => {
          let errorMessage = "Gagal mengambil lokasi"

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Izin lokasi ditolak. Silakan aktifkan lokasi di pengaturan browser."
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Informasi lokasi tidak tersedia."
              break
            case err.TIMEOUT:
              errorMessage = "Waktu habis untuk mengambil lokasi."
              break
          }

          setError(errorMessage)
          setIsLoading(false)
        },
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      )
    }

    return () => {
      clearWatch()
    }
  }, [watch, enableHighAccuracy, timeout, maximumAge, clearWatch])

  return {
    location,
    isLoading,
    error,
    permission,
    getCurrentPosition,
    clearWatch,
    refreshLocation,
  }
}
