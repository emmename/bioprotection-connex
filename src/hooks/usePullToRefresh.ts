import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Check if we are at the top of the page. Support both window and container scroll.
    const isAtTop = window.scrollY === 0 || (containerRef.current && containerRef.current.scrollTop === 0);
    if (isAtTop) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      const isAtTop = window.scrollY === 0 || (containerRef.current && containerRef.current.scrollTop === 0);
      if (isAtTop) {
        // Only prevent default if we are actually pulling to refresh
        if (e.cancelable) {
          e.preventDefault();
        }
        setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
      }
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    // We attach events to window/document to ensure we catch touch events anywhere
    // if the container is not taking up the full viewport height.
    const listeningElement = container || document.body;

    listeningElement.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    listeningElement.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    listeningElement.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    return () => {
      listeningElement.removeEventListener('touchstart', handleTouchStart as any);
      listeningElement.removeEventListener('touchmove', handleTouchMove as any);
      listeningElement.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
    shouldRefresh: pullDistance >= threshold,
  };
}
