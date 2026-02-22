"use client"

import * as React from "react"
import { LogIn, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export type AttendanceState = "can_check_in" | "can_check_out" | "completed" | "not_available"

export interface CheckInOutButtonProps {
  bookingId: string
  status: BookingStatus
  checkInAt: string | null
  checkOutAt: string | null
  onCheckIn?: (bookingId: string) => Promise<void> | void
  onCheckOut?: (bookingId: string) => Promise<void> | void
  isLoading?: boolean
  disabled?: boolean
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  showLabel?: boolean
  checkInLabel?: string
  checkOutLabel?: string
}

export function CheckInOutButton({
  bookingId,
  status,
  checkInAt,
  checkOutAt,
  onCheckIn,
  onCheckOut,
  isLoading = false,
  disabled = false,
  size = "default",
  variant = "default",
  className,
  showLabel = true,
  checkInLabel = "Check In",
  checkOutLabel = "Check Out",
}: CheckInOutButtonProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Determine attendance state based on booking status and timestamps
  const getAttendanceState = (): AttendanceState => {
    // Already checked out
    if (checkOutAt) return "completed"

    // Checked in but not checked out
    if (checkInAt) return "can_check_out"

    // Can check in if booking is accepted
    if (status === "accepted") return "can_check_in"

    // In progress bookings should be able to check out (edge case)
    if (status === "in_progress") return "can_check_out"

    // Completed bookings
    if (status === "completed") return "completed"

    // All other states cannot check in/out
    return "not_available"
  }

  const attendanceState = getAttendanceState()

  const isDisabled = disabled || isLoading || isProcessing || attendanceState === "not_available" || attendanceState === "completed"

  const handleClick = async () => {
    if (isDisabled) return

    setIsProcessing(true)
    try {
      if (attendanceState === "can_check_in" && onCheckIn) {
        await onCheckIn(bookingId)
      } else if (attendanceState === "can_check_out" && onCheckOut) {
        await onCheckOut(bookingId)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const getButtonSize = () => {
    switch (size) {
      case "sm":
        return "sm"
      case "lg":
        return "lg"
      default:
        return "default"
    }
  }

  const getButtonVariant = () => {
    if (variant === "ghost") return "ghost"
    if (variant === "outline") return "outline"
    return "default"
  }

  // Render content based on state
  const renderContent = () => {
    if (isProcessing) {
      return <span>Memproses...</span>
    }

    if (attendanceState === "can_check_in") {
      return (
        <>
          <LogIn className="h-4 w-4" />
          {showLabel && <span>{checkInLabel}</span>}
        </>
      )
    }

    if (attendanceState === "can_check_out") {
      return (
        <>
          <LogOut className="h-4 w-4" />
          {showLabel && <span>{checkOutLabel}</span>}
        </>
      )
    }

    if (attendanceState === "completed") {
      return (
        <>
          <LogOut className="h-4 w-4" />
          {showLabel && <span>Selesai</span>}
        </>
      )
    }

    // Not available state
    return (
      <>
        <LogIn className="h-4 w-4" />
        {showLabel && <span>Tidak Tersedia</span>}
      </>
    )
  }

  // Get aria-label for accessibility
  const getAriaLabel = () => {
    if (attendanceState === "can_check_in") {
      return `Check in untuk booking ${bookingId}`
    }
    if (attendanceState === "can_check_out") {
      return `Check out untuk booking ${bookingId}`
    }
    if (attendanceState === "completed") {
      return `Attendance selesai untuk booking ${bookingId}`
    }
    return `Attendance tidak tersedia untuk booking ${bookingId}`
  }

  return (
    <Button
      variant={getButtonVariant()}
      size={getButtonSize()}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={getAriaLabel()}
      className={cn(className)}
    >
      {renderContent()}
    </Button>
  )
}
