'use client';

import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'locked' | 'rejected';
}

interface ProgressStepperProps {
  steps: Step[];
  currentStage: string;
}

export default function ProgressStepper({ steps, currentStage }: ProgressStepperProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStage);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLocked = index > currentIndex;
          const isRejected = step.status === 'rejected';

          return (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCompleted && 'bg-green-600 border-green-600 text-white',
                    isCurrent && 'bg-blue-600 border-blue-600 text-white',
                    isLocked && 'bg-gray-200 border-gray-300 text-gray-400',
                    isRejected && 'bg-red-100 border-red-400 text-red-600'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-blue-600',
                    isLocked && 'text-gray-400',
                    isRejected && 'text-red-600'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2',
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
