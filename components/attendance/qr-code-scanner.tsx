"use client"

import * as React from "react"
import { Camera, CameraOff, X } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { validateJobQRCode } from "@/lib/supabase/queries/jobs"

export type QRScannerMode = "check-in" | "check-out"

export interface QRCodeScannerProps extends React.HTMLAttributes<HTMLDivElement> {
  bookingId: string
  mode: QRScannerMode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (jobId: string, lat?: number, lng?: number) => void
}

const QRCodeScanner = React.forwardRef<HTMLDivElement, QRCodeScannerProps>(
  ({ bookingId, mode, open, onOpenChange, onSuccess, className, ...props }, ref) => {
    const scannerRef = React.useRef<Html5Qrcode | null>(null)
    const [isScanning, setIsScanning] = React.useState(false)
    const [cameraError, setCameraError] = React.useState<string | null>(null)
    const [processing, setProcessing] = React.useState(false)
    const scannerContainerId = React.useRef(`qr-scanner-${bookingId}-${mode}`)

    // Get mode display text
    const modeText = mode === "check-in" ? "Check-in" : "Check-out"

    // Start scanning
    const startScanning = React.useCallback(async () => {
      setCameraError(null)

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMessage = "Kamera tidak tersedia. Pastikan perangkat memiliki kamera dan izin diberikan."
        setCameraError(errorMessage)
        toast.error(errorMessage)
        return
      }

      try {
        const scanner = new Html5Qrcode(scannerContainerId.current)
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }

        await scanner.start(
          { facingMode: "environment" },
          config,
          async (decodedText: string) => {
            // Stop scanning on successful scan
            await stopScanning()

            // Process the QR code
            await processQRCode(decodedText)
          },
          (errorMessage: string) => {
            // Ignore scan errors (happens when no QR code is in frame)
            // The html5-qrcode library sends error messages continuously when scanning
          }
        )

        setIsScanning(true)
      } catch (error) {
        let errorMessage = "Gagal mengakses kamera"
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMessage = "Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser."
          } else if (error.name === "NotFoundError") {
            errorMessage = "Kamera tidak ditemukan pada perangkat ini."
          } else if (error.name === "NotSupportedError") {
            errorMessage = "Browser ini tidak mendukung akses kamera."
          }
        }
        setCameraError(errorMessage)
        toast.error(errorMessage)
      }
    }, [])

    // Stop scanning
    const stopScanning = React.useCallback(async () => {
      if (scannerRef.current && isScanning) {
        try {
          await scannerRef.current.stop()
          setIsScanning(false)
        } catch (error) {
          // Scanner might already be stopped
          setIsScanning(false)
        }
      }
    }, [isScanning])

    // Process QR code data
    const processQRCode = React.useCallback(
      async (decodedText: string) => {
        if (processing) return

        setProcessing(true)

        try {
          // Validate QR code format and verify it's a valid job QR code
          const result = await validateJobQRCode(decodedText)

          if (!result.isValid) {
            toast.error(result.error || "QR Code tidak valid")
            setProcessing(false)
            // Restart scanning
            await startScanning()
            return
          }

          // Get current GPS location
          let lat: number | undefined
          let lng: number | undefined

          if (navigator.geolocation) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0,
                })
              })

              lat = position.coords.latitude
              lng = position.coords.longitude
            } catch (error) {
              // Location capture failed, but continue without it
              let locationWarning = "Gagal mengambil lokasi GPS"
              if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                  locationWarning = "Izin lokasi ditolak. Melanjutkan tanpa verifikasi lokasi."
                } else if (error.name === "TimeoutError") {
                  locationWarning = "Waktu habis mengambil lokasi. Melanjutkan tanpa verifikasi lokasi."
                }
              }
              toast.warning(locationWarning)
            }
          }

          // Success! Call the success callback
          toast.success(`${modeText} berhasil`)

          onSuccess?.(result.jobId!, lat, lng)

          // Close the dialog
          onOpenChange(false)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Gagal memproses QR Code"
          toast.error(errorMessage)
          setProcessing(false)
          // Restart scanning
          await startScanning()
        }
      },
      [processing, onSuccess, onOpenChange, modeText, startScanning]
    )

    // Close dialog handler
    const handleClose = React.useCallback(async () => {
      await stopScanning()
      onOpenChange(false)
    }, [stopScanning, onOpenChange])

    // Start scanning when dialog opens
    React.useEffect(() => {
      if (open && !isScanning && !cameraError) {
        // Small delay to ensure dialog is rendered
        const timer = setTimeout(() => {
          startScanning()
        }, 100)
        return () => clearTimeout(timer)
      }

      // Cleanup when dialog closes
      return () => {
        if (!open && isScanning) {
          stopScanning()
        }
      }
    }, [open, isScanning, cameraError, startScanning, stopScanning])

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (scannerRef.current) {
          try {
            scannerRef.current.clear()
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }, [])

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          ref={ref}
          className={cn("sm:max-w-md", className)}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (processing) e.preventDefault()
          }}
          {...props}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Scan QR Code untuk {modeText}</DialogTitle>
                <DialogDescription>
                  Arahkan kamera ke QR Code yang ditampilkan oleh penyedia kerja
                </DialogDescription>
              </div>
              {!processing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={processing}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Tutup</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scanner Container */}
            <div className="relative overflow-hidden rounded-lg border bg-black">
              <div id={scannerContainerId.current} className="min-h-[300px]" />

              {!isScanning && !cameraError && !processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-2">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Memuat kamera...</p>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center space-y-2 p-4">
                    <CameraOff className="h-8 w-8 mx-auto text-destructive" />
                    <p className="text-sm text-destructive">{cameraError}</p>
                  </div>
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <div className="h-8 w-8 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">Memproses {modeText}...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground text-center">
                {isScanning
                  ? "Pastikan QR Code terlihat jelas dalam frame"
                  : "Kamera akan aktif secara otomatis"}
              </p>
            </div>

            {/* Action Buttons */}
            {!isScanning && !processing && cameraError && (
              <Button
                onClick={startScanning}
                className="w-full"
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            )}

            {isScanning && !processing && (
              <Button
                onClick={handleClose}
                className="w-full"
                variant="outline"
              >
                Batal
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)
QRCodeScanner.displayName = "QRCodeScanner"

export { QRCodeScanner }
