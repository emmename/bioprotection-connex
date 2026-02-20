import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-8" />
        
        {/* Active progress line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary mx-8 transition-all duration-500"
          style={{ width: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - 4rem)` }}
        />

        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          
          return (
            <div 
              key={stepNumber}
              className="flex flex-col items-center relative z-10"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                  isCompleted && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/30 animate-pulse-glow",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
              <span 
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px] transition-colors",
                  (isCompleted || isActive) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
