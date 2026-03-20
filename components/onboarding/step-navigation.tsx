"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps?: number;
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean;
  isFormValid?: boolean;
  isLastStep?: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps = 3,
  onBack,
  onNext,
  isLoading = false,
  isFormValid = true,
  isLastStep = false,
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;
  const buttonText = isLastStep ? "Complete Profile" : "Continue";
  const ButtonIcon = isLastStep ? null : ChevronRight;

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      {/* Back Button */}
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isLoading}
        className={cn("gap-2", isFirstStep && "invisible")}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Next/Complete Button */}
      <Button
        type="button"
        onClick={onNext}
        disabled={isLoading || !isFormValid}
        className="gap-2 min-w-[140px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {buttonText}
            {ButtonIcon && <ButtonIcon className="w-4 h-4" />}
          </>
        )}
      </Button>
    </div>
  );
}

// Helper import for cn
import { cn } from "@/lib/utils";
