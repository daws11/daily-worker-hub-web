"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  currentStep: number
  totalSteps?: number
}

const STEP_LABELS = ["Personal", "Location", "Skills"]

export function ProgressBar({ currentStep, totalSteps = 3 }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <Progress value={progress} className="h-2" />
      
      {/* Step labels */}
      <div className="flex justify-between text-sm">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          
          return (
            <div 
              key={label}
              className={cn(
                "flex flex-col items-center",
                isActive && "text-primary font-medium",
                isCompleted && "text-muted-foreground",
                !isActive && !isCompleted && "text-muted-foreground/50"
              )}
            >
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span className="text-xs hidden sm:block">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
