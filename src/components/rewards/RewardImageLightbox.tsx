import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface RewardImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardName: string;
}

export function RewardImageLightbox({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  rewardName,
}: RewardImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handlePrev, handleNext, onOpenChange]);

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{rewardName} - รูปที่ {currentIndex + 1}</DialogTitle>
        </VisuallyHidden>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Main image with pinch-to-zoom */}
        <TransformWrapper
          key={currentIndex}
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: 'toggle', step: 2 }}
        >
          {({ resetTransform }) => (
            <div className="relative w-full aspect-square sm:aspect-video flex items-center justify-center">
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={images[currentIndex]}
                  alt={`${rewardName} - รูปที่ ${currentIndex + 1}`}
                  className="max-w-full max-h-[80vh] object-contain select-none"
                  draggable={false}
                />
              </TransformComponent>

              {/* Reset zoom button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-14 z-50 text-white hover:bg-white/20 bg-black/50"
                onClick={() => resetTransform()}
                title="รีเซ็ตซูม"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 text-white hover:bg-black/70 rounded-full z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTransform();
                      handlePrev();
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 text-white hover:bg-black/70 rounded-full z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTransform();
                      handleNext();
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}
            </div>
          )}
        </TransformWrapper>

        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Image counter */}
        <div className="absolute top-4 left-4 text-white/80 text-sm bg-black/50 px-3 py-1 rounded-full z-20">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Zoom hint for touch devices */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full z-20 sm:hidden">
          บีบนิ้วเพื่อซูม • แตะสองครั้งเพื่อขยาย
        </div>
      </DialogContent>
    </Dialog>
  );
}
