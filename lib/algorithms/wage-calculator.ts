/**
 * Wage Calculator Algorithm
 *
 * Calculates wages with overtime support:
 * - Minimum 4 hours per shift
 * - Maximum 12 hours per day
 * - Overtime multiplier: 1.5x for 9-12 hours
 * - Platform fee: 6% of total wage
 * - Community fund: 1% deducted from worker's wage
 */

import {
  getHourlyRate,
  getOvertimeMultiplier,
  getHoursBreakdown,
  formatRupiah as formatRupiahFn,
} from '@/lib/constants/rate-bali';

// Re-export formatRupiah for external use
export { formatRupiahFn as formatRupiah } from '@/lib/constants/rate-bali';

// Re-export from utils for consistency
export { formatRupiah } from '@/lib/utils';

/**
 * Wage calculation result
 */
export interface WageCalculation {
  hourlyRate: number;
  hoursNeeded: number;
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  baseWage: number;
  overtimeWage: number;
  totalWage: number;
  platformFee: number;
  businessPays: number;
  workerReceives: number;
  communityFund: number;
  platformEarns: number;
}

/**
 * Calculate wage for a job
 *
 * @param category - Job category
 * @param regency - Region name
 * @param hoursNeeded - Hours needed (4-12)
 * @returns Wage calculation breakdown
 */
export function calculateWage(
  category: string,
  regency: string,
  hoursNeeded: number
): WageCalculation {
  // Validate hours
  const validHours = Math.max(4, Math.min(12, hoursNeeded));

  // Get hourly rate
  const hourlyRate = getHourlyRate(category, regency);

  // Get hours breakdown
  const { regularHours, overtimeHours } = getHoursBreakdown(validHours);

  // Get overtime multiplier
  const overtimeMultiplier = getOvertimeMultiplier(validHours);

  // Calculate wages
  const baseWage = regularHours * hourlyRate;
  const overtimeWage = overtimeHours * hourlyRate * overtimeMultiplier;
  const totalWage = baseWage + overtimeWage;

  // Calculate fees
  const platformFee = Math.round(totalWage * 0.06); // 6% platform fee
  const communityFund = Math.round(totalWage * 0.01); // 1% community fund

  // Calculate what each party pays/receives
  const businessPays = totalWage + platformFee;
  const workerReceives = totalWage - communityFund;
  const platformEarns = platformFee - communityFund;

  return {
    hourlyRate,
    hoursNeeded: validHours,
    regularHours,
    overtimeHours,
    overtimeMultiplier,
    baseWage,
    overtimeWage,
    totalWage,
    platformFee,
    businessPays,
    workerReceives,
    communityFund,
    platformEarns,
  };
}

/**
 * Get wage breakdown for display
 *
 * @param calculation - Wage calculation result
 * @returns Formatted breakdown object
 */
export function getWageBreakdown(calculation: WageCalculation): {
  description: string;
  items: Array<{
    label: string;
    value: string;
    highlighted?: boolean;
  }>;
} {
  const items = [
    {
      label: 'Hourly Rate',
      value: formatRupiah(calculation.hourlyRate) + '/jam',
    },
    {
      label: 'Regular Hours',
      value: `${calculation.regularHours}h × ${formatRupiah(calculation.hourlyRate)}/jam = ${formatRupiah(calculation.baseWage)}`,
    },
  ];

  if (calculation.overtimeHours > 0) {
    items.push({
      label: 'Overtime',
      value: `${calculation.overtimeHours}h × ${formatRupiah(calculation.hourlyRate)}/jam × ${calculation.overtimeMultiplier}x = ${formatRupiah(calculation.overtimeWage)}`,
    });
  }

  items.push(
    {
      label: 'Total Wage',
      value: formatRupiah(calculation.totalWage),
      highlighted: true,
    },
    {
      label: 'Platform Fee (6%)',
      value: formatRupiah(calculation.platformFee),
    },
    {
      label: 'You Pay',
      value: formatRupiah(calculation.businessPays),
      highlighted: true,
    }
  );

  return {
    description: `${calculation.hoursNeeded} hours × ${formatRupiah(calculation.hourlyRate)}/jam`,
    items,
  };
}

/**
 * Format wage for display
 *
 * @param calculation - Wage calculation result
 * @param options - Display options
 * @returns Formatted wage string
 */
export interface FormatWageDisplayOptions {
  showBreakdown?: boolean;
  showBusinessPays?: boolean;
  showWorkerReceives?: boolean;
  showPlatformFee?: boolean;
}

export function formatWageDisplay(
  calculation: WageCalculation,
  options: FormatWageDisplayOptions = {}
): string {
  const {
    showBreakdown = false,
    showBusinessPays = true,
    showWorkerReceives = false,
    showPlatformFee = true,
  } = options;

  let result = '';

  if (showBreakdown) {
    result += `Base: ${formatRupiah(calculation.baseWage)}`;
    if (calculation.overtimeWage > 0) {
      result += ` + OT: ${formatRupiah(calculation.overtimeWage)}`;
    }
    result += '\n';
  }

  result += `Total: ${formatRupiah(calculation.totalWage)}`;

  if (showPlatformFee) {
    result += ` (Fee: ${formatRupiah(calculation.platformFee)})`;
  }

  if (showBusinessPays) {
    result += `\nYou Pay: ${formatRupiah(calculation.businessPays)}`;
  }

  if (showWorkerReceives) {
    result += `\nWorker Gets: ${formatRupiah(calculation.workerReceives)}`;
  }

  return result;
}

/**
 * Format wage for quick display (compact format)
 *
 * @param calculation - Wage calculation result
 * @returns Compact wage string
 */
export function formatWageCompact(calculation: WageCalculation): string {
  if (calculation.overtimeHours > 0) {
    return `${calculation.hoursNeeded}h × ${formatRupiah(calculation.hourlyRate)}/jam (${calculation.overtimeHours}h OT) = ${formatRupiah(calculation.businessPays)}`;
  }
  return `${calculation.hoursNeeded}h × ${formatRupiah(calculation.hourlyRate)}/jam = ${formatRupiah(calculation.businessPays)}`;
}

/**
 * Calculate wage for multiple workers
 *
 * @param category - Job category
 * @param regency - Region name
 * @param hoursNeeded - Hours needed per worker
 * @param workerCount - Number of workers
 * @returns Total wage calculation for all workers
 */
export function calculateMultipleWorkersWage(
  category: string,
  regency: string,
  hoursNeeded: number,
  workerCount: number
): WageCalculation & { workerCount: number } {
  const singleWorkerWage = calculateWage(category, regency, hoursNeeded);

  return {
    ...singleWorkerWage,
    workerCount,
    totalWage: singleWorkerWage.totalWage * workerCount,
    baseWage: singleWorkerWage.baseWage * workerCount,
    overtimeWage: singleWorkerWage.overtimeWage * workerCount,
    platformFee: singleWorkerWage.platformFee * workerCount,
    businessPays: singleWorkerWage.businessPays * workerCount,
    workerReceives: singleWorkerWage.workerReceives * workerCount,
    communityFund: singleWorkerWage.communityFund * workerCount,
    platformEarns: singleWorkerWage.platformEarns * workerCount,
  };
}

/**
 * Get wage estimate based on category and hours
 * For quick estimates without full calculation
 *
 * @param category - Job category
 * @param regency - Region name
 * @param hoursNeeded - Hours needed
 * @returns Estimated total wage
 */
export function getWageEstimate(
  category: string,
  regency: string,
  hoursNeeded: number
): number {
  const calculation = calculateWage(category, regency, hoursNeeded);
  return calculation.businessPays;
}
