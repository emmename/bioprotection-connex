import { useState, useRef, useCallback } from 'react';
import { useDropZone } from '@/hooks/useDropZone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  bucket: string;
  maxImages?: number;
}

export function ImageUploader({ images, onImagesChange, bucket, maxImages = 10 }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      toast.error(`สามารถอัปโหลดได้สูงสุด ${maxImages} รูป`);
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} ไม่ใช่ไฟล์รูปภาพ`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} ขนาดเกิน 5MB`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`ไม่สามารถอัปโหลด ${file.name} ได้`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      newImages.push(publicUrl);
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast.success(`อัปโหลดสำเร็จ ${newImages.length} รูป`);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images, maxImages, bucket, onImagesChange]);

  const { isDragging, dropZoneProps } = useDropZone({
    accept: 'image/*',
    multiple: true,
    disabled: isUploading || images.length >= maxImages,
    onDrop: processFiles,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3" {...dropZoneProps}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= maxImages}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          อัปโหลดรูปภาพ
        </Button>
        <span className="text-sm text-muted-foreground">
          {images.length}/{maxImages} รูป
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={img}
                alt={`รูปภาพ ${index + 1}`}
                className="w-full h-full object-cover rounded-md border"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              {index === 0 && (
                <Badge className="absolute bottom-1 left-1 text-xs">
                  หลัก
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
              : 'hover:bg-muted/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{isDragging ? 'วางรูปภาพที่นี่' : 'คลิกหรือลากรูปมาวางเพื่อเพิ่มรูปภาพ'}</p>
          <p className="text-xs mt-1">รองรับ JPG, PNG, GIF สูงสุด 5MB</p>
        </div>
      )}

      {isDragging && images.length > 0 && (
        <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center bg-primary/10 text-primary text-sm font-medium">
          วางรูปภาพที่นี่เพื่อเพิ่ม
        </div>
      )}
    </div>
  );
}
