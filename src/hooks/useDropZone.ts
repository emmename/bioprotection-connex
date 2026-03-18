import { useState, useCallback, useRef, type DragEvent } from 'react';

interface UseDropZoneOptions {
  accept?: string; // e.g. "image/*", ".csv", "image/*,.pdf"
  multiple?: boolean;
  disabled?: boolean;
  onDrop: (files: File[]) => void;
}

export function useDropZone({ accept, multiple = false, disabled = false, onDrop }: UseDropZoneOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const isAccepted = useCallback((file: File): boolean => {
    if (!accept) return true;
    const acceptTypes = accept.split(',').map(t => t.trim());
    return acceptTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.endsWith('/*')) {
        const group = type.split('/')[0];
        return file.type.startsWith(group + '/');
      }
      return file.type === type;
    });
  }, [accept]);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(isAccepted);

    if (validFiles.length === 0) return;

    if (!multiple) {
      onDrop([validFiles[0]]);
    } else {
      onDrop(validFiles);
    }
  }, [disabled, isAccepted, multiple, onDrop]);

  const dropZoneProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return { isDragging, dropZoneProps };
}
