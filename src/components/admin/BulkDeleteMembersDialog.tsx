import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface BulkDeleteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onDeleteComplete: () => void;
}

export function BulkDeleteMembersDialog({ 
  open, 
  onOpenChange, 
  selectedIds,
  onDeleteComplete 
}: BulkDeleteMembersDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedConfirmText = 'ลบสมาชิก';
  const isConfirmValid = confirmText === expectedConfirmText;
  const count = selectedIds.length;

  const handleDelete = async () => {
    if (!isConfirmValid || count === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`ลบสมาชิก ${count} คนเรียบร้อยแล้ว`, {
        description: 'ข้อมูลที่เกี่ยวข้องถูกลบออกจากระบบแล้ว',
      });
      
      onOpenChange(false);
      setConfirmText('');
      onDeleteComplete();
    } catch (error) {
      console.error('Error deleting members:', error);
      toast.error('ไม่สามารถลบสมาชิกได้', {
        description: 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setConfirmText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle>ยืนยันการลบสมาชิก {count} คน</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              คุณกำลังจะลบสมาชิกที่เลือกไว้ <strong className="text-foreground">{count} คน</strong>
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-destructive mb-2">⚠️ ข้อมูลที่จะถูกลบสำหรับทุกคน:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>ข้อมูลโปรไฟล์และข้อมูลอาชีพ</li>
                <li>ประวัติการเช็คอินรายวัน</li>
                <li>ประวัติคะแนนและเหรียญทั้งหมด</li>
                <li>ใบเสร็จที่อัปโหลด</li>
                <li>ประวัติการแลกของรางวัล</li>
                <li>ความคืบหน้าเนื้อหาและภารกิจ</li>
                <li>ประวัติการเล่นเกม</li>
              </ul>
            </div>
            <p className="text-sm text-destructive font-medium">
              การดำเนินการนี้ไม่สามารถยกเลิกได้!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4 space-y-2">
          <Label htmlFor="confirm-bulk-delete" className="text-sm">
            พิมพ์ <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{expectedConfirmText}</span> เพื่อยืนยัน
          </Label>
          <Input
            id="confirm-bulk-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedConfirmText}
            className="font-medium"
            disabled={isDeleting}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                ลบ {count} คนถาวร
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
