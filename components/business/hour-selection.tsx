/**
 * Hour Selection Component
 *
 * Allows business users to select hours needed (4-12 hours)
 * with a slider and quick option buttons
 */

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface HourSelectionProps {
  value: number;
  onChange: (hours: number) => void;
  min?: number;
  max?: number;
  showQuickOptions?: boolean;
  disabled?: boolean;
}

const QUICK_OPTIONS = [4, 6, 8, 10, 12] as const;

export function HourSelection({
  value,
  onChange,
  min = 4,
  max = 12,
  showQuickOptions = true,
  disabled = false,
}: HourSelectionProps) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    const roundedValue = Math.round(newValue[0]);
    setInternalValue(roundedValue);
    onChange(roundedValue);
  };

  const handleQuickOptionClick = (hours: number) => {
    setInternalValue(hours);
    onChange(hours);
  };

  const getOvertimeInfo = () => {
    if (internalValue >= 9) {
      return {
        hasOvertime: true,
        overtimeHours: internalValue - 8,
        multiplier: 1.5,
      };
    }
    return {
      hasOvertime: false,
      overtimeHours: 0,
      multiplier: 1.0,
    };
  };

  const overtimeInfo = getOvertimeInfo();

  return (
    <div className="space-y-4">
      {/* Label and Value Display */}
      <div className="flex items-center justify-between">
        <Label htmlFor="hours-slider" className="text-base font-semibold">
          Jam Dibutuhkan
        </Label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-2xl font-bold',
              overtimeInfo.hasOvertime ? 'text-orange-600' : 'text-blue-600'
            )}
          >
            {internalValue} jam
          </span>
          {overtimeInfo.hasOvertime && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
              {overtimeInfo.overtimeHours}h OT
            </span>
          )}
        </div>
      </div>

      {/* Slider */}
      <Slider
        id="hours-slider"
        value={[internalValue]}
        onValueChange={handleSliderChange}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        className={cn(
          'py-2',
          overtimeInfo.hasOvertime && '[&_[role=slider]]:bg-orange-500'
        )}
      />

      {/* Hours Labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{min}h</span>
        <span className="text-center">8h (Regular)</span>
        <span>{max}h</span>
      </div>

      {/* Quick Options */}
      {showQuickOptions && (
        <div className="flex gap-2 flex-wrap">
          {QUICK_OPTIONS.map(hours => (
            <Button
              key={hours}
              type="button"
              variant={internalValue === hours ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleQuickOptionClick(hours)}
              disabled={disabled}
              className={cn(
                'flex-1 min-w-[60px]',
                internalValue === hours &&
                  hours >= 9 &&
                  'bg-orange-600 hover:bg-orange-700'
              )}
            >
              {hours}h
            </Button>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div
        className={cn(
          'rounded-lg p-3 text-sm',
          overtimeInfo.hasOvertime
            ? 'bg-orange-50 border border-orange-200 text-orange-900'
            : 'bg-blue-50 border border-blue-200 text-blue-900'
        )}
      >
        <div className="font-medium mb-1">
          {overtimeInfo.hasOvertime ? (
            <span>⚠️ Lembur Termasuk</span>
          ) : (
            <span>✓ Tarif Reguler</span>
          )}
        </div>
        {overtimeInfo.hasOvertime ? (
          <p className="text-xs">
            {overtimeInfo.overtimeHours} jam lembur dengan tarif {overtimeInfo.multiplier}x
          </p>
        ) : (
          <p className="text-xs">
            Minimum 4 jam, maksimum 12 jam per hari
          </p>
        )}
      </div>

      {/* Regular vs Overtime Breakdown */}
      {internalValue > 4 && (
        <div className="flex gap-2 text-xs">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-md p-2 text-center">
            <div className="text-green-700 font-medium">
              {Math.min(internalValue, 8)} jam
            </div>
            <div className="text-green-600">Reguler</div>
          </div>
          {internalValue > 8 && (
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded-md p-2 text-center">
              <div className="text-orange-700 font-medium">
                {internalValue - 8} jam
              </div>
              <div className="text-orange-600">Lembur ({overtimeInfo.multiplier}x)</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HourSelectionCompactProps {
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}

export function HourSelectionCompact({
  value,
  onChange,
  disabled = false,
}: HourSelectionCompactProps) {
  const handleQuickOptionClick = (hours: number) => {
    onChange(hours);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Jam Dibutuhkan: {value}h</Label>
      <div className="flex gap-2">
        {QUICK_OPTIONS.map(hours => (
          <Button
            key={hours}
            type="button"
            variant={value === hours ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleQuickOptionClick(hours)}
            disabled={disabled}
            className="flex-1 min-w-[50px]"
          >
            {hours}h
          </Button>
        ))}
      </div>
    </div>
  );
}
