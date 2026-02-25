import * as React from "react"
import { Download, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { EarningsTransaction, EarningsExportRequest } from "@/lib/types/earnings"
import { formatIDR } from "@/lib/utils/currency"

export interface EarningsExportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  transactions?: EarningsTransaction[] | null
  isLoading?: boolean
  startDate?: string
  endDate?: string
  includeBreakdown?: boolean
  fileName?: string
  onExportStart?: () => void
  onExportComplete?: (fileName: string) => void
  onExportError?: (error: Error) => void
  disabled?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  exportLabel?: string
  loadingLabel?: string
}

const EarningsExportButton = React.forwardRef<HTMLButtonElement, EarningsExportButtonProps>(
  (
    {
      transactions,
      isLoading = false,
      startDate,
      endDate,
      includeBreakdown = false,
      fileName,
      onExportStart,
      onExportComplete,
      onExportError,
      disabled = false,
      variant = "outline",
      size = "default",
      exportLabel = "Ekspor CSV",
      loadingLabel = "Mengekspor...",
      className,
      ...props
    },
    ref
  ) => {
    const [isExporting, setIsExporting] = React.useState(false)

    // Format date to Indonesian locale
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    }

    // Format currency for CSV (remove currency symbol, keep formatting)
    const formatCurrencyForCSV = (amount: number): string => {
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    // Convert transactions to CSV format
    const convertToCSV = (data: EarningsTransaction[]): string => {
      if (data.length === 0) {
        return "ID,Jenis Transaksi,Pekerjaan,Bisnis,Jumlah,Status,Tanggal,Diselesaikan Pada\n"
      }

      // CSV Header
      const headers = [
        "ID",
        "Jenis Transaksi",
        "Pekerjaan",
        "Bisnis",
        "Jumlah",
        "Mata Uang",
        "Status",
        "Tanggal",
        "Diselesaikan Pada",
      ]

      // Convert transactions to CSV rows
      const rows = data.map((transaction) => {
        // Get transaction type label in Indonesian
        const typeLabel =
          transaction.type === "payment"
            ? "Pembayaran"
            : transaction.type === "refund"
            ? "Pengembalian Dana"
            : transaction.type

        // Get status label in Indonesian
        const statusLabel =
          transaction.status === "pending"
            ? "Menunggu"
            : transaction.status === "success"
            ? "Berhasil"
            : transaction.status === "failed"
            ? "Gagal"
            : transaction.status

        // Format amount
        const amount = formatCurrencyForCSV(transaction.amount)

        // Format dates
        const createdDate = transaction.created_at
          ? formatDate(transaction.created_at)
          : "-"
        const completedDate = transaction.completed_at
          ? formatDate(transaction.completed_at)
          : "-"

        // Escape commas and quotes in fields
        const escapeField = (field: string): string => {
          if (field.includes(",") || field.includes('"') || field.includes("\n")) {
            return `"${field.replace(/"/g, '""')}"`
          }
          return field
        }

        return [
          escapeField(transaction.id),
          escapeField(typeLabel),
          escapeField(transaction.job_title),
          escapeField(transaction.business_name),
          escapeField(amount),
          "IDR",
          escapeField(statusLabel),
          escapeField(createdDate),
          escapeField(completedDate),
        ].join(",")
      })

      // Add summary rows if breakdown is included
      let summaryRows: string[] = []
      if (includeBreakdown && data.length > 0) {
        const totalAmount = data.reduce(
          (sum, t) => sum + (t.type === "payment" ? t.amount : -t.amount),
          0
        )
        const paymentCount = data.filter((t) => t.type === "payment").length
        const refundCount = data.filter((t) => t.type === "refund").length

        summaryRows = [
          "",
          "",
          "", // Empty rows for spacing
          `RINGKASAN,,,`,
          `Total Transaksi,${data.length},,`,
          `Pembayaran,${paymentCount},,`,
          `Pengembalian Dana,${refundCount},,`,
          `Total Pendapatan,${formatCurrencyForCSV(totalAmount)},IDR,`,
        ]
      }

      return [headers.join(","), ...rows, ...summaryRows].join("\n")
    }

    // Generate filename
    const generateFileName = (): string => {
      if (fileName) return fileName.endsWith(".csv") ? fileName : `${fileName}.csv`

      const now = new Date()
      const dateStr = now.toISOString().split("T")[0]
      return `pendapatan-${dateStr}.csv`
    }

    // Download CSV file
    const downloadCSV = (csvContent: string, filename: string): void => {
      try {
        // Create Blob with UTF-8 BOM for Excel compatibility
        const blob = new Blob(["\ufeff" + csvContent], {
          type: "text/csv;charset=utf-8;",
        })

        // Create download link
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)

        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = "hidden"

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up URL object
        URL.revokeObjectURL(url)

        toast.success("Berhasil mengekspor data pendapatan", {
          description: `File ${filename} telah diunduh`,
        })
      } catch (error) {
        throw new Error(
          `Gagal mengunduh file: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    // Handle export click
    const handleExport = async () => {
      // Check if transactions are available
      if (!transactions || transactions.length === 0) {
        toast.error("Tidak ada data untuk diekspor", {
          description: "Selesaikan beberapa pekerjaan terlebih dahulu",
        })
        return
      }

      setIsExporting(true)
      onExportStart?.()

      try {
        // Add a small delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Convert to CSV
        const csvContent = convertToCSV(transactions)

        // Generate filename
        const filename = generateFileName()

        // Download file
        downloadCSV(csvContent, filename)

        onExportComplete?.(filename)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Terjadi kesalahan saat mengekspor data"

        toast.error("Gagal mengekspor data", {
          description: errorMessage,
        })

        onExportError?.(error instanceof Error ? error : new Error(errorMessage))
      } finally {
        setIsExporting(false)
      }
    }

    const isDisabled = disabled || isLoading || isExporting || !transactions || transactions.length === 0

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={handleExport}
        {...props}
      >
        {isExporting || isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" aria-hidden="true"></div>
            <span className="sr-only">{loadingLabel}</span>
            {loadingLabel}
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            {exportLabel}
          </>
        )}
      </Button>
    )
  }
)
EarningsExportButton.displayName = "EarningsExportButton"

export { EarningsExportButton }
