import type {
  EarningsSummary,
  MonthlyEarnings,
  PositionEarnings,
  IncomeProjection,
  EarningsTransaction,
  EARNINGS_CONSTANTS,
} from '../types/earnings'

/**
 * Calculate total earnings from an array of transactions
 * @param transactions - Array of earnings transactions
 * @returns Total earnings amount
 */
export function calculateTotalEarnings(transactions: EarningsTransaction[]): number {
  return transactions
    .filter((t) => t.status === 'success')
    .reduce((sum, t) => sum + t.amount, 0)
}

/**
 * Calculate earnings for a specific date range
 * @param transactions - Array of earnings transactions
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Total earnings within the date range
 */
export function calculateEarningsInDateRange(
  transactions: EarningsTransaction[],
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return transactions
    .filter((t) => {
      const transactionDate = new Date(t.created_at)
      return (
        t.status === 'success' &&
        transactionDate >= start &&
        transactionDate <= end
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)
}

/**
 * Group transactions by month
 * @param transactions - Array of earnings transactions
 * @returns Map of month (YYYY-MM) to transactions
 */
export function groupTransactionsByMonth(
  transactions: EarningsTransaction[]
): Map<string, EarningsTransaction[]> {
  const grouped = new Map<string, EarningsTransaction[]>()

  for (const transaction of transactions) {
    if (transaction.status !== 'success') continue

    const date = new Date(transaction.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, [])
    }
    grouped.get(monthKey)!.push(transaction)
  }

  return grouped
}

/**
 * Calculate monthly earnings from grouped transactions
 * @param groupedTransactions - Map of month to transactions
 * @returns Array of monthly earnings data
 */
export function calculateMonthlyEarnings(
  groupedTransactions: Map<string, EarningsTransaction[]>
): MonthlyEarnings[] {
  const monthlyEarnings: MonthlyEarnings[] = []

  for (const [month, transactions] of groupedTransactions.entries()) {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0)
    const count = transactions.length
    const average = count > 0 ? total / count : 0

    const date = new Date(month + '-01')
    const monthName = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(date)

    monthlyEarnings.push({
      month,
      month_name: monthName,
      earnings: total,
      bookings_count: count,
      average_earning: average,
    })
  }

  // Sort by month descending (most recent first)
  return monthlyEarnings.sort((a, b) => b.month.localeCompare(a.month))
}

/**
 * Group transactions by position
 * @param transactions - Array of earnings transactions
 * @returns Map of position title to transactions
 */
export function groupTransactionsByPosition(
  transactions: EarningsTransaction[]
): Map<string, { transactions: EarningsTransaction[]; categoryName: string | null }> {
  const grouped = new Map<
    string,
    { transactions: EarningsTransaction[]; categoryName: string | null }
  >()

  for (const transaction of transactions) {
    if (transaction.status !== 'success') continue

    const key = transaction.job_title

    if (!grouped.has(key)) {
      grouped.set(key, { transactions: [], categoryName: null })
    }
    grouped.get(key)!.transactions.push(transaction)
  }

  return grouped
}

/**
 * Calculate earnings by position from grouped transactions
 * @param groupedTransactions - Map of position to transactions
 * @returns Array of position earnings data
 */
export function calculateEarningsByPosition(
  groupedTransactions: Map<string, { transactions: EarningsTransaction[]; categoryName: string | null }>
): PositionEarnings[] {
  const positionEarnings: PositionEarnings[] = []

  for (const [positionTitle, { transactions }] of groupedTransactions.entries()) {
    const amounts = transactions.map((t) => t.amount)
    const total = amounts.reduce((sum, amount) => sum + amount, 0)
    const count = transactions.length
    const average = count > 0 ? total / count : 0
    const highest = amounts.length > 0 ? Math.max(...amounts) : 0
    const lowest = amounts.length > 0 ? Math.min(...amounts) : 0
    const lastBooking = transactions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    positionEarnings.push({
      position_title: positionTitle,
      category_name: null, // Can be enhanced if category data is available
      total_earnings: total,
      bookings_count: count,
      average_earning: average,
      highest_single_earning: highest,
      lowest_single_earning: lowest,
      last_booking_date: lastBooking?.completed_at || lastBooking?.created_at || null,
    })
  }

  // Sort by total earnings descending (highest earning first)
  return positionEarnings.sort((a, b) => b.total_earnings - a.total_earnings)
}

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (can be negative for decrease)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Calculate average earnings per booking
 * @param totalEarnings - Total earnings
 * @param bookingCount - Number of bookings
 * @returns Average earnings per booking
 */
export function calculateAveragePerBooking(totalEarnings: number, bookingCount: number): number {
  return bookingCount > 0 ? totalEarnings / bookingCount : 0
}

/**
 * Calculate booking frequency (bookings per week)
 * @param bookingCount - Total number of bookings
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Bookings per week
 */
export function calculateBookingFrequency(
  bookingCount: number,
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const weeks = (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)

  if (weeks <= 0) return 0
  return bookingCount / weeks
}

/**
 * Determine confidence level based on data points
 * @param dataPoints - Number of data points (e.g., bookings)
 * @param thresholds - Confidence thresholds from EARNINGS_CONSTANTS
 * @returns Confidence level
 */
export function determineConfidenceLevel(
  dataPoints: number,
  thresholds: typeof EARNINGS_CONSTANTS
): 'low' | 'medium' | 'high' {
  if (dataPoints >= thresholds.HIGH_CONFIDENCE_THRESHOLD) return 'high'
  if (dataPoints >= thresholds.MEDIUM_CONFIDENCE_THRESHOLD) return 'medium'
  return 'low'
}

/**
 * Calculate trend based on comparing recent period to previous period
 * @param recentAmount - Amount in recent period
 * @param previousAmount - Amount in previous period
 * @returns Trend percentage (positive for upward, negative for downward)
 */
export function calculateTrend(recentAmount: number, previousAmount: number): number {
  if (previousAmount === 0) {
    return recentAmount > 0 ? 100 : 0
  }
  return ((recentAmount - previousAmount) / previousAmount) * 100
}

/**
 * Project income using simple average method
 * @param averageEarningPerBooking - Average earning per booking
 * @param bookingFrequency - Bookings per week
 * @param periodInWeeks - Number of weeks to project
 * @returns Projected income
 */
export function projectIncomeSimpleAverage(
  averageEarningPerBooking: number,
  bookingFrequency: number,
  periodInWeeks: number
): number {
  return averageEarningPerBooking * bookingFrequency * periodInWeeks
}

/**
 * Project income using trend-based method
 * @param recentAmount - Recent period earnings
 * @param trendPercentage - Trend percentage
 * @param periods - Number of periods to project
 * @returns Projected income
 */
export function projectIncomeTrendBased(
  recentAmount: number,
  trendPercentage: number,
  periods: number
): number {
  const growthFactor = 1 + trendPercentage / 100
  let projected = 0
  let amount = recentAmount

  for (let i = 0; i < periods; i++) {
    projected += amount
    amount *= growthFactor
  }

  return projected
}

/**
 * Project income using booking-based method
 * @param confirmedBookingsTotal - Total from confirmed upcoming bookings
 * @param averageNewBookingsPerPeriod - Average new bookings per period
 * @param averageEarningPerBooking - Average earning per booking
 * @returns Projected income
 */
export function projectIncomeBookingBased(
  confirmedBookingsTotal: number,
  averageNewBookingsPerPeriod: number,
  averageEarningPerBooking: number
): number {
  return confirmedBookingsTotal + averageNewBookingsPerPeriod * averageEarningPerBooking
}

/**
 * Create income projection object
 * @param period - Projection period
 * @param projectedIncome - Calculated projected income
 * @param recentBookingsCount - Number of recent bookings
 * @param averageEarningPerBooking - Average earning per booking
 * @param bookingFrequency - Bookings per week
 * @param trendPercentage - Trend percentage
 * @param calculationMethod - Method used for calculation
 * @param thresholds - Confidence thresholds
 * @returns Income projection object
 */
export function createIncomeProjection(
  period: 'week' | 'month' | 'quarter',
  projectedIncome: number,
  recentBookingsCount: number,
  averageEarningPerBooking: number,
  bookingFrequency: number,
  trendPercentage: number,
  calculationMethod: 'simple_average' | 'trend_based' | 'booking_based',
  thresholds: typeof EARNINGS_CONSTANTS
): IncomeProjection {
  return {
    period,
    projected_income: Math.round(projectedIncome),
    confidence: determineConfidenceLevel(recentBookingsCount, thresholds),
    calculation_method: calculationMethod,
    factors: {
      recent_bookings_count: recentBookingsCount,
      average_earning_per_booking: Math.round(averageEarningPerBooking),
      booking_frequency: Math.round(bookingFrequency * 10) / 10,
      trend_percentage: Math.round(trendPercentage * 10) / 10,
    },
    calculated_at: new Date().toISOString(),
  }
}

/**
 * Calculate period start date based on earnings period type
 * @param period - Period type
 * @param endDate - End date (ISO string), defaults to now
 * @returns Start date (ISO string)
 */
export function calculatePeriodStartDate(
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time',
  endDate: string = new Date().toISOString()
): string {
  const end = new Date(endDate)
  const start = new Date(end)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week':
      start.setDate(end.getDate() - 7)
      break
    case 'month':
      start.setMonth(end.getMonth() - 1)
      break
    case 'quarter':
      start.setMonth(end.getMonth() - 3)
      break
    case 'year':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'all_time':
      // Return a very old date
      return new Date('2000-01-01').toISOString()
      break
  }

  return start.toISOString()
}

/**
 * Filter transactions by date range
 * @param transactions - Array of earnings transactions
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Filtered transactions
 */
export function filterTransactionsByDateRange(
  transactions: EarningsTransaction[],
  startDate: string,
  endDate: string
): EarningsTransaction[] {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return transactions.filter((t) => {
    const transactionDate = new Date(t.created_at)
    return transactionDate >= start && transactionDate <= end
  })
}

/**
 * Calculate earnings summary from transactions
 * @param transactions - All earnings transactions
 * @param currentMonthStart - Current month start date (ISO string)
 * @param previousMonthStart - Previous month start date (ISO string)
 * @param previousMonthEnd - Previous month end date (ISO string)
 * @returns Earnings summary object
 */
export function calculateEarningsSummary(
  transactions: EarningsTransaction[],
  currentMonthStart: string,
  previousMonthStart: string,
  previousMonthEnd: string
): Omit<EarningsSummary, 'period_start' | 'period_end' | 'currency'> {
  const successfulTransactions = transactions.filter((t) => t.status === 'success')
  const currentMonthTransactions = filterTransactionsByDateRange(
    successfulTransactions,
    currentMonthStart,
    new Date().toISOString()
  )
  const previousMonthTransactions = filterTransactionsByDateRange(
    successfulTransactions,
    previousMonthStart,
    previousMonthEnd
  )

  const totalEarnings = calculateTotalEarnings(successfulTransactions)
  const currentMonthEarnings = calculateTotalEarnings(currentMonthTransactions)
  const previousMonthEarnings = calculateTotalEarnings(previousMonthTransactions)

  const totalBookings = successfulTransactions.length
  const averagePerBooking = calculateAveragePerBooking(totalEarnings, totalBookings)
  const monthOverMonthChange = calculatePercentageChange(
    currentMonthEarnings,
    previousMonthEarnings
  )

  return {
    total_earnings: totalEarnings,
    current_month_earnings: currentMonthEarnings,
    previous_month_earnings: previousMonthEarnings,
    month_over_month_change: monthOverMonthChange,
    total_bookings_completed: totalBookings,
    average_earnings_per_booking: averagePerBooking,
  }
}
