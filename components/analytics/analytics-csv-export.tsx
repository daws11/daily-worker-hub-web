'use client'

import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnalyticsExportData } from '@/lib/types/analytics'

/**
 * Props for the AnalyticsCsvExport component
 */
interface AnalyticsCsvExportProps {
  /**
   * Array of analytics data to export
   */
  data: AnalyticsExportData[]
  /**
   * Filename for the exported CSV (without extension)
   * @default 'analytics-export'
   */
  filename?: string
  /**
   * Optional custom class name for styling
   */
  className?: string
  /**
   * Button variant from shadcn/ui Button component
   * @default 'outline'
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /**
   * Button size from shadcn/ui Button component
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /**
   * Whether the export button is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Optional callback when export completes successfully
   */
  onExportComplete?: (filename: string) => void
  /**
   * Optional callback when export fails
   */
  onExportError?: (error: Error) => void
}

/**
 * Converts analytics data array to CSV format
 *
 * @param data - Array of analytics export data
 * @returns CSV string formatted with headers and data rows
 * @throws Error if data is empty or invalid
 */
function convertToCSV(data: AnalyticsExportData[]): string {
  if (!data || data.length === 0) {
    throw new Error('No data available for export')
  }

  // Define CSV headers
  const headers = ['Date', 'Worker Name', 'Position', 'Amount', 'Status', 'Reliability Score']

  // Convert data rows to CSV format
  const rows = data.map((row) => {
    const values = [
      row.date,
      `"${row.worker_name.replace(/"/g, '""')}"`, // Escape quotes in worker name
      `"${row.position.replace(/"/g, '""')}"`, // Escape quotes in position
      row.amount.toString(),
      row.status,
      row.reliability_score.toString(),
    ]
    return values.join(',')
  })

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Creates a downloadable CSV file and triggers download
 *
 * @param csvContent - CSV formatted string
 * @param filename - Name for the downloaded file (without extension)
 * @throws Error if blob creation or download fails
 */
function downloadCSV(csvContent: string, filename: string): void {
  try {
    // Create blob with CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

    // Create download link
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'

    // Append to document, click, and cleanup
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Revoke URL to free memory
    URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error(`Failed to create CSV download: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * AnalyticsCsvExport Component
 *
 * A button component that exports analytics data as a downloadable CSV file.
 * The CSV includes columns for date, worker name, position, amount, status, and reliability score.
 *
 * @example
 * ```tsx
 * <AnalyticsCsvExport
 *   data={analyticsData}
 *   filename="business-analytics-2024"
 *   onExportComplete={(filename) => console.log(`Exported ${filename}`)}
 * />
 * ```
 */
export function AnalyticsCsvExport({
  data,
  filename = 'analytics-export',
  className,
  variant = 'outline',
  size = 'default',
  disabled = false,
  onExportComplete,
  onExportError,
}: AnalyticsCsvExportProps) {
  /**
   * Handles the CSV export process
   */
  const handleExport = useCallback(() => {
    try {
      // Generate timestamp for unique filename
      const timestamp = new Date().toISOString().split('T')[0]
      const uniqueFilename = `${filename}-${timestamp}`

      // Convert data to CSV
      const csvContent = convertToCSV(data)

      // Trigger download
      downloadCSV(csvContent, uniqueFilename)

      // Call success callback if provided
      onExportComplete?.(uniqueFilename)
    } catch (error) {
      const exportError = error instanceof Error ? error : new Error('Unknown export error')
      onExportError?.(exportError)
    }
  }, [data, filename, onExportComplete, onExportError])

  const isDisabled = disabled || !data || data.length === 0

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isDisabled}
      className={cn('', className)}
    >
      <Download className="h-4 w-4" />
      Ekspor CSV
    </Button>
  )
}
