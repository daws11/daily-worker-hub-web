"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"
import { Download, Printer, RefreshCw, Calendar, MapPin, Building2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { generateJobQRCode } from "@/lib/supabase/queries/jobs"

export interface QRCodeGeneratorProps extends React.HTMLAttributes<HTMLDivElement> {
  jobId: string
  jobTitle: string
  businessName: string
  address?: string
  startDate?: string
  existingQRCode?: string | null
  onRefresh?: () => void
}

const QRCodeGenerator = React.forwardRef<
  HTMLDivElement,
  QRCodeGeneratorProps
>(
  (
    {
      jobId,
      jobTitle,
      businessName,
      address,
      startDate,
      existingQRCode,
      onRefresh,
      className,
      ...props
    },
    ref
  ) => {
    const [qrCode, setQrCode] = React.useState<string | null>(existingQRCode || null)
    const [isRegenerating, setIsRegenerating] = React.useState(false)
    const qrRef = React.useRef<HTMLDivElement>(null)

    // Format date to Indonesian locale
    const formatDate = (dateString?: string) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }

    // Generate QR code
    const handleGenerateQR = async () => {
      setIsRegenerating(true)
      try {
        const result = await generateJobQRCode(jobId)
        setQrCode(result.qr_code)
        toast.success("QR Code berhasil diperbarui")
        onRefresh?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal membuat QR Code")
      } finally {
        setIsRegenerating(false)
      }
    }

    // Download QR code as image
    const handleDownload = () => {
      const svgElement = qrRef.current?.querySelector("svg")
      if (!svgElement) {
        toast.error("QR Code tidak tersedia")
        return
      }

      try {
        // Serialize SVG
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgElement)
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        // Create download link
        const link = document.createElement("a")
        link.href = url
        link.download = `qr-code-${jobId}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success("QR Code berhasil diunduh")
      } catch {
        toast.error("Gagal mengunduh QR Code")
      }
    }

    // Print QR code
    const handlePrint = () => {
      if (!qrRef.current) {
        toast.error("QR Code tidak tersedia")
        return
      }

      try {
        const printWindow = window.open("", "_blank")
        if (!printWindow) {
          toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.")
          return
        }

        const svgElement = qrRef.current.querySelector("svg")
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgElement)

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>QR Code - ${jobTitle}</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  padding: 20px;
                  box-sizing: border-box;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .job-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin: 0 0 10px 0;
                }
                .business-name {
                  font-size: 16px;
                  color: #666;
                  margin: 0;
                }
                .qr-container {
                  display: flex;
                  justify-content: center;
                  margin: 20px 0;
                }
                .footer {
                  margin-top: 30px;
                  font-size: 12px;
                  color: #999;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 class="job-title">${jobTitle}</h1>
                <p class="business-name">${businessName}</p>
              </div>
              <div class="qr-container">
                ${svgString}
              </div>
              <div class="footer">
                <p>Scan QR Code ini untuk check-in/check-out kehadiran</p>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      } catch {
        toast.error("Gagal mencetak QR Code")
      }
    }

    // Generate QR code on mount if not exists
    React.useEffect(() => {
      if (!qrCode) {
        handleGenerateQR()
      }
    }, [])

    const formattedDate = formatDate(startDate)

    return (
      <Card ref={ref} className={cn("w-full", className)} {...props}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <CardTitle className="line-clamp-1">QR Code Kehadiran</CardTitle>
              <CardDescription>
                Tunjukkan QR Code ini kepada pekerja untuk check-in/check-out
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGenerateQR}
              disabled={isRegenerating}
              title="Perbarui QR Code"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRegenerating && "animate-spin"
                )}
              />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Job Details */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
            <h3 className="font-medium text-sm">{jobTitle}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{businessName}</span>
              </div>
              {address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{address}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              ref={qrRef}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              {qrCode ? (
                <QRCodeSVG
                  value={qrCode}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center text-sm text-muted-foreground">
                  Memuat QR Code...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!qrCode}
              >
                <Download className="h-4 w-4" />
                Unduh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!qrCode}
              >
                <Printer className="h-4 w-4" />
                Cetak
              </Button>
            </div>
          </div>

          {/* Info Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-xs">
              QR Code berlaku selama pekerjaan aktif
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }
)
QRCodeGenerator.displayName = "QRCodeGenerator"

export { QRCodeGenerator }
