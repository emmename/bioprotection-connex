import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing,
  threshold = 80 
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;
  
  if (!shouldShow) return null;

  return (
    <div 
      className="absolute left-0 right-0 flex justify-center z-50 pointer-events-none"
      style={{ 
        top: Math.min(pullDistance - 40, threshold - 40),
        opacity: Math.min(progress * 2, 1),
        transform: `scale(${0.5 + progress * 0.5})`,
      }}
    >
      <div className={cn(
        "bg-primary/10 backdrop-blur-sm rounded-full p-3 shadow-lg border border-primary/20",
        isRefreshing && "bg-primary/20"
      )}>
        <RefreshCw 
          className={cn(
            "w-6 h-6 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
