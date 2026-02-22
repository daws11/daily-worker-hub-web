"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  checkIn,
  checkOut,
  getJobAttendanceHistory,
  getWorkerAttendanceHistory,
  verifyWorkerLocation,
  calculateAttendanceRate,
  getAttendanceList,
  getWorkerAttendanceStats,
} from "../supabase/queries/attendance"
import type {
  AttendanceWithRelations,
  WorkerAttendanceHistory,
  JobAttendanceHistory,
  AttendanceListResponse,
  AttendanceStats,
  LocationVerificationResult,
} from "../types/attendance"

type UseAttendanceOptions = {
  workerId?: string
  jobId?: string
  businessId?: string
  autoFetch?: boolean
}

type UseAttendanceReturn = {
  attendanceList: AttendanceListResponse | null
  workerHistory: WorkerAttendanceHistory | null
  jobHistory: JobAttendanceHistory | null
  attendanceStats: AttendanceStats | null
  attendanceRate: number | null
  locationVerified: LocationVerificationResult | null
  isLoading: boolean
  error: string | null
  fetchAttendanceList: (params?: {
    worker_id?: string
    job_id?: string
    business_id?: string
    start_date?: string
    end_date?: string
    page?: number
    limit?: number
  }) => Promise<void>
  fetchWorkerHistory: (workerId: string) => Promise<void>
  fetchJobHistory: (jobId: string) => Promise<void>
  fetchWorkerStats: (workerId: string) => Promise<void>
  fetchAttendanceRate: (workerId: string) => Promise<void>
  verifyLocation: (jobId: string, workerLat: number, workerLng: number) => Promise<void>
  workerCheckIn: (bookingId: string, lat?: number, lng?: number) => Promise<void>
  workerCheckOut: (bookingId: string, lat?: number, lng?: number) => Promise<void>
  refreshAttendance: () => Promise<void>
}

export function useAttendance(options: UseAttendanceOptions = {}): UseAttendanceReturn {
  const { workerId, jobId, businessId } = options

  const [attendanceList, setAttendanceList] = useState<AttendanceListResponse | null>(null)
  const [workerHistory, setWorkerHistory] = useState<WorkerAttendanceHistory | null>(null)
  const [jobHistory, setJobHistory] = useState<JobAttendanceHistory | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [locationVerified, setLocationVerified] = useState<LocationVerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAttendanceList = useCallback(async (
    params?: {
      worker_id?: string
      job_id?: string
      business_id?: string
      start_date?: string
      end_date?: string
      page?: number
      limit?: number
    }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAttendanceList(params || {
        worker_id: workerId,
        job_id: jobId,
        business_id: businessId,
      })

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil data kehadiran: " + result.error.message)
        return
      }

      setAttendanceList(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil data kehadiran: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [workerId, jobId, businessId])

  const fetchWorkerHistory = useCallback(async (workerId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getWorkerAttendanceHistory(workerId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil riwayat kehadiran: " + result.error.message)
        return
      }

      setWorkerHistory(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil riwayat kehadiran: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchJobHistory = useCallback(async (jobId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getJobAttendanceHistory(jobId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil riwayat kehadiran pekerjaan: " + result.error.message)
        return
      }

      setJobHistory(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil riwayat kehadiran pekerjaan: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchWorkerStats = useCallback(async (workerId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getWorkerAttendanceStats(workerId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal mengambil statistik kehadiran: " + result.error.message)
        return
      }

      setAttendanceStats(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal mengambil statistik kehadiran: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAttendanceRate = useCallback(async (workerId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await calculateAttendanceRate(workerId)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal menghitung tingkat kehadiran: " + result.error.message)
        return
      }

      setAttendanceRate(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal menghitung tingkat kehadiran: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const verifyLocation = useCallback(async (jobId: string, workerLat: number, workerLng: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyWorkerLocation(jobId, workerLat, workerLng)

      setLocationVerified(result)

      if (!result.is_verified && result.status !== 'unverified') {
        toast.warning("Lokasi Anda berada di luar jangkauan yang ditentukan")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal memverifikasi lokasi: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const workerCheckIn = useCallback(async (bookingId: string, lat?: number, lng?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await checkIn(bookingId, lat, lng)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal check-in: " + result.error.message)
        return
      }

      toast.success("Check-in berhasil")

      // Refresh attendance data after check-in
      await fetchAttendanceList()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal check-in: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchAttendanceList])

  const workerCheckOut = useCallback(async (bookingId: string, lat?: number, lng?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await checkOut(bookingId, lat, lng)

      if (result.error) {
        setError(result.error.message)
        toast.error("Gagal check-out: " + result.error.message)
        return
      }

      toast.success("Check-out berhasil")

      // Refresh attendance data after check-out
      await fetchAttendanceList()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga"
      setError(errorMessage)
      toast.error("Gagal check-out: " + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchAttendanceList])

  const refreshAttendance = useCallback(async () => {
    await fetchAttendanceList()
  }, [fetchAttendanceList])

  // Auto-fetch on mount and when options change
  useEffect(() => {
    if (options.autoFetch !== false && (workerId || jobId || businessId)) {
      if (workerId) {
        fetchWorkerHistory(workerId)
      } else if (jobId) {
        fetchJobHistory(jobId)
      } else {
        fetchAttendanceList()
      }
    }
  }, [workerId, jobId, businessId, options.autoFetch, fetchAttendanceList, fetchWorkerHistory, fetchJobHistory])

  return {
    attendanceList,
    workerHistory,
    jobHistory,
    attendanceStats,
    attendanceRate,
    locationVerified,
    isLoading,
    error,
    fetchAttendanceList,
    fetchWorkerHistory,
    fetchJobHistory,
    fetchWorkerStats,
    fetchAttendanceRate,
    verifyLocation,
    workerCheckIn,
    workerCheckOut,
    refreshAttendance,
  }
}
