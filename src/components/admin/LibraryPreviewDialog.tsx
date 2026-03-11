import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, ExternalLink } from 'lucide-react';
import type { LibraryItem } from './LibraryItemTable';

interface LibraryPreviewDialogProps {
  item: LibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function renderVideoEmbed(url: string) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        className="w-full aspect-video rounded-lg"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    );
  }

  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return (
      <iframe
        src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
        className="w-full aspect-video rounded-lg"
        allowFullScreen
        allow="autoplay"
      />
    );
  }

  return (
    <video controls className="w-full rounded-lg" src={url}>
      Your browser does not support the video tag.
    </video>
  );
}

export function LibraryPreviewDialog({ item, open, onOpenChange }: LibraryPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="pr-8">{item?.title}</DialogTitle>
          {item?.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </DialogHeader>

        <div className="px-6 pb-6 overflow-auto max-h-[calc(90vh-120px)]">
          {item?.item_type === 'article' && item.content_body && (
            <div
              className="prose prose-sm max-w-none mt-4"
              dangerouslySetInnerHTML={{ __html: item.content_body }}
            />
          )}

          {item?.item_type === 'image' && item.file_url && (
            <div className="mt-4">
              <img src={item.file_url} alt={item.title} className="w-full rounded-lg" />
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={item.file_url} target="_blank" rel="noopener" download>
                    <Download className="w-4 h-4 mr-2" /> ดาวน์โหลด
                  </a>
                </Button>
              </div>
            </div>
          )}

          {item?.item_type === 'video' && item.file_url && (
            <div className="mt-4">
              {renderVideoEmbed(item.file_url)}
            </div>
          )}

          {item?.item_type === 'pdf' && item.file_url && (
            <div className="mt-4">
              <iframe
                src={`${item.file_url}#toolbar=0`}
                className="w-full h-[60vh] rounded-lg border bg-muted"
                title={item.title}
              />
              <div className="flex justify-end mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a href={item.file_url} target="_blank" rel="noopener">
                    <ExternalLink className="w-4 h-4 mr-2" /> เปิดในแท็บใหม่
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
