/**
 * Convert data to CSV format and trigger download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @throws Error if data is empty or invalid
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string
): void {
  if (!data || data.length === 0) {
    throw new Error("No data to export")
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Handle null/undefined
          if (value == null) return ""
          // Handle strings with commas or quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        })
        .join(",")
    ),
  ].join("\n")

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export analytics dashboard data as PDF using browser print
 * @param title - Title of the report
 */
export function exportToPDF(title: string = "Laporan Analitik Platform"): void {
  // Store original overflow styles
  const originalBodyOverflow = document.body.style.overflow
  const originalHtmlOverflow = document.documentElement.style.overflow

  // Prepare for print
  window.print()

  // Restore overflow styles after print dialog closes
  const restoreStyles = () => {
    document.body.style.overflow = originalBodyOverflow
    document.documentElement.style.overflow = originalHtmlOverflow
    window.removeEventListener("afterprint", restoreStyles)
  }
  window.addEventListener("afterprint", restoreStyles)
}

/**
 * Download a blob as a file
 * @param blob - Blob to download
 * @param filename - Name of the file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Format analytics data for CSV export
 * @param data - Dashboard data object
 * @param dateRange - Date range preset for filename
 * @returns Formatted data with section identifier
 */
export function formatAnalyticsDataForExport(
  data: Record<string, any>,
  dateRange: string
): Array<{ section: string; metric: string; value: string }> {
  const exportData: Array<{ section: string; metric: string; value: string }> = []

  // User Growth
  if (data.user_growth?.metrics?.length) {
    const latest = data.user_growth.metrics[data.user_growth.metrics.length - 1]
    exportData.push(
      { section: "Pertumbuhan Pengguna", metric: "Total Pengguna", value: String(latest.cumulative_users) },
      { section: "Pertumbuhan Pengguna", metric: "Pengguna Baru", value: String(data.user_growth.metrics.reduce((sum: number, m: any) => sum + m.total_new_users, 0)) },
      { section: "Pertumbuhan Pengguna", metric: "Pekerja Baru", value: String(data.user_growth.metrics.reduce((sum: number, m: any) => sum + m.new_workers, 0)) }
    )
  }

  // Job Completion
  if (data.job_completion?.metrics?.length) {
    const metrics = data.job_completion.metrics
    exportData.push(
      { section: "Job Completion", metric: "Total Job", value: String(metrics.reduce((sum: number, m: any) => sum + m.total_jobs, 0)) },
      { section: "Job Completion", metric: "Job Selesai", value: String(metrics.reduce((sum: number, m: any) => sum + m.completed_jobs, 0)) },
      { section: "Job Completion", metric: "Rata-rata Completion Rate", value: `${Math.round(metrics.reduce((sum: number, m: any) => sum + m.completion_rate_percentage, 0) / metrics.length)}%` }
    )
  }

  // Transaction Volume
  if (data.transaction_volume?.metrics?.length) {
    const metrics = data.transaction_volume.metrics
    const totalVolume = metrics.reduce((sum: number, m: any) => sum + m.total_payment_volume, 0)
    exportData.push(
      { section: "Volume Transaksi", metric: "Total Transaksi", value: String(metrics.reduce((sum: number, m: any) => sum + m.total_transactions, 0)) },
      { section: "Volume Transaksi", metric: "Total Volume", value: formatCurrencyForExport(totalVolume) },
      { section: "Volume Transaksi", metric: "Rata-rata Success Rate", value: `${Math.round(metrics.reduce((sum: number, m: any) => sum + m.success_rate_percentage, 0) / metrics.length)}%` }
    )
  }

  // Revenue
  if (data.revenue?.metrics?.length) {
    const metrics = data.revenue.metrics
    exportData.push(
      { section: "Pendapatan Platform", metric: "Gross Revenue", value: formatCurrencyForExport(metrics.reduce((sum: number, m: any) => sum + m.gross_revenue, 0)) },
      { section: "Pendapatan Platform", metric: "Net Revenue", value: formatCurrencyForExport(metrics.reduce((sum: number, m: any) => sum + m.net_revenue, 0)) },
      { section: "Pendapatan Platform", metric: "Biaya Platform", value: formatCurrencyForExport(metrics.reduce((sum: number, m: any) => sum + m.platform_fee, 0)) }
    )
  }

  // Compliance
  if (data.compliance?.metrics?.length) {
    const metrics = data.compliance.metrics
    exportData.push(
      { section: "Verifikasi KYC", metric: "Pekerja Terverifikasi", value: String(metrics.reduce((sum: number, m: any) => sum + m.verified_workers, 0)) },
      { section: "Verifikasi KYC", metric: "Menunggu Verifikasi", value: String(metrics[metrics.length - 1]?.pending_verifications || 0) }
    )
  }

  // Geographic Distribution (top 5)
  if (data.geographic_distribution?.data?.length) {
    data.geographic_distribution.data.slice(0, 5).forEach((location: any, index: number) => {
      exportData.push({
        section: "Distribusi Geografis",
        metric: `#${index + 1} ${location.location_name}`,
        value: `${location.worker_count} pekerja, ${location.job_count} lowongan, ${location.booking_count} booking`
      })
    })
  }

  // Trending Categories (top 5)
  if (data.trending_categories?.data?.length) {
    data.trending_categories.data.slice(0, 5).forEach((category: any, index: number) => {
      exportData.push({
        section: "Kategori Populer",
        metric: `#${index + 1} ${category.category_name}`,
        value: `${category.job_count} lowongan, ${category.booking_count} booking, Demand: ${category.demand_ratio.toFixed(1)}x`
      })
    })
  }

  return exportData
}

/**
 * Format number as Indonesian Rupiah for export
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
function formatCurrencyForExport(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generate filename with date range
 * @param baseName - Base filename
 * @param dateRange - Date range preset
 * @returns Generated filename
 */
export function generateExportFilename(baseName: string, dateRange: string): string {
  const date = new Date()
  const dateStr = date.toISOString().split("T")[0] // YYYY-MM-DD format

  const rangeLabel: Record<string, string> = {
    today: "hari-ini",
    yesterday: "kemarin",
    last_7_days: "7-hari",
    last_30_days: "30-hari",
    last_90_days: "90-hari",
    this_month: "bulan-ini",
    last_month: "bulan-lalu",
    this_year: "tahun-ini",
  }

  const range = rangeLabel[dateRange] || dateRange
  return `${baseName}-${range}-${dateStr}`
}
