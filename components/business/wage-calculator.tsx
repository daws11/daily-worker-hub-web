/**
 * Wage Calculator Component
 *
 * Displays real-time wage calculation with breakdown
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HourSelection } from "./hour-selection";
import {
  calculateWage,
  getWageBreakdown,
  formatRupiah,
} from "@/lib/algorithms/wage-calculator";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

interface WageCalculatorProps {
  category: string;
  regency: string;
  hoursNeeded: number;
  onHoursChange: (hours: number) => void;
  onCategoryChange?: (category: string) => void;
  onRegencyChange?: (regency: string) => void;
  readonly?: boolean;
  showWorkerBreakdown?: boolean;
}

export function WageCalculator({
  category,
  regency,
  hoursNeeded,
  onHoursChange,
  onCategoryChange,
  onRegencyChange,
  readonly = false,
  showWorkerBreakdown = false,
}: WageCalculatorProps) {
  const [calculation, setCalculation] = useState(() =>
    calculateWage(category, regency, hoursNeeded),
  );

  useEffect(() => {
    setCalculation(calculateWage(category, regency, hoursNeeded));
  }, [category, regency, hoursNeeded]);

  const breakdown = getWageBreakdown(calculation);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>💰</span>
          <span>Wage Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hour Selection */}
        {!readonly && (
          <HourSelection value={hoursNeeded} onChange={onHoursChange} />
        )}

        {/* Current Hours Display (Readonly Mode) */}
        {readonly && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Jam Dibutuhkan
            </span>
            <Badge variant={hoursNeeded >= 9 ? "destructive" : "default"}>
              {hoursNeeded} jam
              {hoursNeeded > 8 && ` (${hoursNeeded - 8}h OT)`}
            </Badge>
          </div>
        )}

        <Separator />

        {/* Wage Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Hourly Rate ({category}, {regency})
            </span>
            <span className="font-medium">
              {formatRupiah(calculation.hourlyRate)}/jam
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Regular Hours ({calculation.regularHours}h)
            </span>
            <span className="font-medium">
              {formatRupiah(calculation.baseWage)}
            </span>
          </div>

          {calculation.overtimeHours > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Overtime ({calculation.overtimeHours}h @{" "}
                {calculation.overtimeMultiplier}x)
              </span>
              <span className="font-medium text-orange-600">
                {formatRupiah(calculation.overtimeWage)}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <span className="font-semibold">Total Wage</span>
            <span className="font-bold text-lg">
              {formatRupiah(calculation.totalWage)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee (6%)</span>
            <span className="text-muted-foreground">
              {formatRupiah(calculation.platformFee)}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="font-bold text-base">You Pay</span>
            <span className="font-bold text-xl text-blue-600">
              {formatRupiah(calculation.businessPays)}
            </span>
          </div>
        </div>

        {/* Worker Breakdown (Optional) */}
        {showWorkerBreakdown && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Worker receives (minus 1% community fund)</span>
              </div>
              <div className="flex justify-between text-sm bg-green-50 p-3 rounded-md">
                <span>Worker Net Wage</span>
                <span className="font-semibold text-green-700">
                  {formatRupiah(calculation.workerReceives)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Overtime Info */}
        {calculation.overtimeHours > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <span className="text-orange-600 font-semibold text-lg">⚠️</span>
              <div className="flex-1">
                <div className="font-medium text-orange-900 text-sm">
                  Overtime Included
                </div>
                <div className="text-xs text-orange-700 mt-1">
                  {calculation.overtimeHours} hour(s) overtime at 1.5x rate
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WageCalculatorCompactProps {
  category: string;
  regency: string;
  hoursNeeded: number;
  businessPays?: number;
}

export function WageCalculatorCompact({
  category,
  regency,
  hoursNeeded,
  businessPays,
}: WageCalculatorCompactProps) {
  const calculation = calculateWage(category, regency, hoursNeeded);

  const displayBusinessPays = businessPays ?? calculation.businessPays;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {hoursNeeded}h × {formatRupiah(calculation.hourlyRate)}/jam
        </span>
        <Badge variant={hoursNeeded >= 9 ? "destructive" : "secondary"}>
          {hoursNeeded > 8 && `${hoursNeeded - 8}h OT`}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="font-bold text-lg text-blue-600">
          {formatRupiah(displayBusinessPays)}
        </span>
      </div>
    </div>
  );
}
