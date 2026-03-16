"use client"

import * as React from "react"
import { toast } from "sonner"
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Timer,
  AlertCircle,
  CheckCircle,
  MapPin,
  FileText,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================================================
// TYPES
// ============================================================================

type BookingStatus = "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"

export interface BookingCheckInOutProps {
  bookingId: string
  bookingStatus: BookingStatus
  checkInAt: string | null
  checkOutAt: string | null
  jobTitle?: string
  businessName?: string
  onCheckIn?: (bookingId: string, location?: { lat: number; lng: number }) => Promise<void>
  onCheckOut?: (bookingId: string, data: { actualHours?: number; notes?: string }) => Promise<void>
  className?: string
}

type AttendanceState = "can_check_in" | "can_check_out" | "completed" | "not_available"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ============================================================================
// TIMER COMPONENT
// ============================================================================

function WorkTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const start = new Date(startTime).getTime()
    
    const updateElapsed = () => {
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return (
    <div className="flex items-center gap-2 text-2xl font-mono font-bold text-blue-600">
      <Timer className="h-6 w-6" />
      <span>{formatDuration(elapsed)}</span>
    </div>
  )
}

// ============================================================================
// CHECK-OUT DIALOG
// ============================================================================

interface CheckOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: { actualHours?: number; notes?: string }) => Promise<void>
  isLoading?: boolean
  suggestedHours?: number
}

function CheckOutDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isLoading,
  suggestedHours 
}: CheckOutDialogProps) {
  const [actualHours, setActualHours] = React.useState<string>(suggestedHours?.toString() || "")
  const [notes, setNotes] = React.useState("")

  const handleConfirm = async () => {
    const hours = actualHours ? parseFloat(actualHours) : undefined
    await onConfirm({ 
      actualHours: hours, 
      notes: notes.trim() || undefined 
    })
    setActualHours("")
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Check Out
          </DialogTitle>
          <DialogDescription>
            Konfirmasi check out dan masukkan detail pekerjaan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="actualHours">Jam Kerja Aktual</Label>
            <Input
              id="actualHours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder={suggestedHours ? `Saran: ${suggestedHours.toFixed(1)} jam` : "Masukkan jam kerja"}
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Masukkan jumlah jam kerja yang sebenarnya
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan tentang pekerjaan hari ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Konfirmasi Check Out
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingCheckInOut({
  bookingId,
  bookingStatus,
  checkInAt,
  checkOutAt,
  jobTitle,
  businessName,
  onCheckIn,
  onCheckOut,
  className,
}: BookingCheckInOutProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showCheckOutDialog, setShowCheckOutDialog] = React.useState(false)
  const [currentLocation, setCurrentLocation] = React.useState<{ lat: number; lng: number } | null>(null)

  // Determine attendance state
  const getAttendanceState = (): AttendanceState => {
    if (checkOutAt) return "completed"
    if (checkInAt) return "can_check_out"
    if (bookingStatus === "accepted") return "can_check_in"
    if (bookingStatus === "in_progress") return "can_check_out"
    if (bookingStatus === "completed") return "completed"
    return "not_available"
  }

  const attendanceState = getAttendanceState()

  // Calculate suggested hours based on check-in time
  const getSuggestedHours = (): number | undefined => {
    if (!checkInAt) return undefined
    const start = new Date(checkInAt).getTime()
    const now = Date.now()
    return Math.round((now - start) / 3600000 * 10) / 10 // Round to 1 decimal
  }

  // Handle check-in
  const handleCheckIn = async () => {
    if (!onCheckIn) return

    setIsLoading(true)
    try {
      // Try to get location
      let location: { lat: number; lng: number } | undefined
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
            })
          })
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCurrentLocation(location)
        } catch (geoError) {
          console.warn("Could not get location:", geoError)
          // Continue without location
        }
      }

      await onCheckIn(bookingId, location)
      toast.success("Check-in berhasil / Check-in successful")
    } catch (error: any) {
      toast.error(error.message || "Gagal check-in / Check-in failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle check-out confirmation
  const handleCheckOutConfirm = async (data: { actualHours?: number; notes?: string }) => {
    if (!onCheckOut) return

    setIsLoading(true)
    try {
      await onCheckOut(bookingId, data)
      toast.success("Check-out berhasil / Check-out successful")
      setShowCheckOutDialog(false)
    } catch (error: any) {
      toast.error(error.message || "Gagal check-out / Check-out failed")
    } finally {
      setIsLoading(false)
    }
  }

  // Render based on state
  if (attendanceState === "not_available") {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Check-in/out tidak tersedia untuk booking ini
          </p>
        </CardContent>
      </Card>
    )
  }

  if (attendanceState === "completed") {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Sesi Selesai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Check In</span>
              <p className="font-medium">{checkInAt ? formatTime(checkInAt) : "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Check Out</span>
              <p className="font-medium">{checkOutAt ? formatTime(checkOutAt) : "-"}</p>
            </div>
          </div>
          <Badge variant="secondary" className="w-full justify-center py-2">
            <CheckCircle className="h-4 w-4 mr-2" />
            Pekerjaan Selesai
          </Badge>
        </CardContent>
      </Card>
    )
  }

  if (attendanceState === "can_check_out") {
    return (
      <>
        <Card className={className}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Sedang Bekerja
            </CardTitle>
            {jobTitle && (
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Timer */}
            {checkInAt && <WorkTimer startTime={checkInAt} />}

            {/* Check-in info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LogIn className="h-4 w-4 text-green-600" />
              <span>Check in: {formatTime(checkInAt!)}</span>
            </div>

            {/* Location */}
            {currentLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Lokasi tercatat</span>
              </div>
            )}

            <Button
              onClick={() => setShowCheckOutDialog(true)}
              disabled={isLoading}
              className="w-full"
              variant="destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </Button>
          </CardContent>
        </Card>

        <CheckOutDialog
          open={showCheckOutDialog}
          onOpenChange={setShowCheckOutDialog}
          onConfirm={handleCheckOutConfirm}
          isLoading={isLoading}
          suggestedHours={getSuggestedHours()}
        />
      </>
    )
  }

  // can_check_in
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Siap untuk Check In
        </CardTitle>
        {jobTitle && (
          <p className="text-sm text-muted-foreground">{jobTitle}</p>
        )}
        {businessName && (
          <p className="text-xs text-muted-foreground">{businessName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
            <LogIn className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Tekan tombol di bawah untuk check in ke pekerjaan
          </p>
          <Button
            onClick={handleCheckIn}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Check In
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>Lokasi akan direkam saat check in</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// COMPACT VERSION FOR LIST VIEW
// ============================================================================

export function BookingCheckInOutCompact({
  bookingId,
  bookingStatus,
  checkInAt,
  checkOutAt,
  onCheckIn,
  onCheckOut,
}: Omit<BookingCheckInOutProps, 'jobTitle' | 'businessName' | 'className'>) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showCheckOutDialog, setShowCheckOutDialog] = React.useState(false)

  const getAttendanceState = (): AttendanceState => {
    if (checkOutAt) return "completed"
    if (checkInAt) return "can_check_out"
    if (bookingStatus === "accepted") return "can_check_in"
    if (bookingStatus === "in_progress") return "can_check_out"
    if (bookingStatus === "completed") return "completed"
    return "not_available"
  }

  const attendanceState = getAttendanceState()

  const handleCheckIn = async () => {
    if (!onCheckIn) return
    setIsLoading(true)
    try {
      await onCheckIn(bookingId)
      toast.success("Check-in berhasil / Check-in successful")
    } catch (error: any) {
      toast.error(error.message || "Gagal check-in / Check-in failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOutConfirm = async (data: { actualHours?: number; notes?: string }) => {
    if (!onCheckOut) return
    setIsLoading(true)
    try {
      await onCheckOut(bookingId, data)
      toast.success("Check-out berhasil / Check-out successful")
      setShowCheckOutDialog(false)
    } catch (error: any) {
      toast.error(error.message || "Gagal check-out / Check-out failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (attendanceState === "not_available") {
    return null
  }

  if (attendanceState === "completed") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Selesai
      </Badge>
    )
  }

  if (attendanceState === "can_check_out") {
    return (
      <>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowCheckOutDialog(true)}
          disabled={isLoading}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Check Out
        </Button>

        <CheckOutDialog
          open={showCheckOutDialog}
          onOpenChange={setShowCheckOutDialog}
          onConfirm={handleCheckOutConfirm}
          isLoading={isLoading}
          suggestedHours={checkInAt ? Math.round((Date.now() - new Date(checkInAt).getTime()) / 3600000 * 10) / 10 : undefined}
        />
      </>
    )
  }

  return (
    <Button
      size="sm"
      onClick={handleCheckIn}
      disabled={isLoading}
      className="bg-green-600 hover:bg-green-700"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <LogIn className="h-4 w-4 mr-1" />
          Check In
        </>
      )}
    </Button>
  )
}
