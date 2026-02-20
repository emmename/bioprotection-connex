import { useState } from 'react';
import { Package, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RewardImageLightbox } from './RewardImageLightbox';

interface RewardImageGalleryProps {
  images: string[];
  imageUrl?: string | null;
  name: string;
  isOutOfStock?: boolean;
}

export function RewardImageGallery({ images, imageUrl, name, isOutOfStock }: RewardImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Combine images array with legacy imageUrl
  const allImages = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allImages.length > 0) {
      setLightboxOpen(true);
    }
  };

  if (allImages.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Package className="h-16 w-16 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative w-full h-full group cursor-zoom-in"
        onClick={openLightbox}
      >
        <img
          src={allImages[currentIndex]}
          alt={`${name} - รูปที่ ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Zoom indicator */}
        <div className="absolute top-2 left-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-4 w-4" />
        </div>
        
        {/* Navigation arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Image indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-md text-sm font-medium">
              หมดแล้ว
            </span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <RewardImageLightbox
        images={allImages}
        initialIndex={currentIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        rewardName={name}
      />
    </>
  );
}
