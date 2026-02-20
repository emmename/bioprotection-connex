import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Check, X, Clock } from 'lucide-react';

interface MissionCompletionsDialogProps {
  mission: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Completion {
  id: string;
  profile_id: string;
  status: string;
  points_earned: number;
  coins_earned: number;
  completed_at: string;
  proof_image_url: string | null;
  profile: {
    first_name: string;
    last_name: string;
    member_id: string | null;
  } | null;
}

export function MissionCompletionsDialog({ mission, open, onOpenChange }: MissionCompletionsDialogProps) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompletions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mission_completions')
        .select('*, profile:profiles(first_name, last_name, member_id)')
        .eq('mission_id', mission.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setCompletions((data || []) as unknown as Completion[]);
    } catch (error) {
      console.error('Error fetching completions:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  }, [mission.id]);

  useEffect(() => {
    if (open) fetchCompletions();
  }, [open, fetchCompletions]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('mission_completions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว');
      fetchCompletions();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white"><Check className="h-3 w-3 mr-1" />อนุมัติ</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />ปฏิเสธ</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />รอตรวจสอบ</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>สถานะการทำภารกิจ: {mission.title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
        ) : completions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">ยังไม่มีสมาชิกทำภารกิจนี้</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สมาชิก</TableHead>
                <TableHead>รหัสสมาชิก</TableHead>
                <TableHead>วันที่ทำ</TableHead>
                <TableHead>หลักฐาน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completions.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.profile ? `${c.profile.first_name} ${c.profile.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.profile?.member_id || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(c.completed_at), 'd MMM yy HH:mm', { locale: th })}
                  </TableCell>
                  <TableCell>
                    {c.proof_image_url ? (
                      <a href={c.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                        ดูรูป
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    {c.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(c.id, 'approved')}>
                          <Check className="h-3 w-3 mr-1" />อนุมัติ
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateStatus(c.id, 'rejected')}>
                          <X className="h-3 w-3 mr-1" />ปฏิเสธ
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
