import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, CheckCircle, XCircle, Eye, ImageIcon, ZoomIn } from 'lucide-react';
import { RewardImageLightbox } from '@/components/rewards/RewardImageLightbox';

interface Receipt {
  id: string;
  profile_id: string;
  image_url: string;
  amount: number | null;
  status: string;
  points_awarded: number | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  profile?: {
    first_name: string;
    last_name: string;
    member_id: string | null;
  };
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'รอตรวจสอบ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ไม่อนุมัติ', variant: 'destructive' },
};

export default function AdminReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [pointsToAward, setPointsToAward] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isApproving, setIsApproving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    fetchReceipts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('receipts')
        .select(`
          *,
          profile:profiles(first_name, last_name, member_id)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected');
      }

      const { data, error } = await query;

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      toast.error('ไม่สามารถโหลดข้อมูลใบเสร็จได้');
    } finally {
      setIsLoading(false);
    }
  };

  const MAX_POINTS_AWARD = 100000; // Maximum points that can be awarded per receipt

  const handleApprove = async () => {
    if (!selectedReceipt) return;

    setIsApproving(true);
    try {
      const points = parseInt(pointsToAward) || 0;

      // Validate points input - prevent negative or excessively large values
      if (points < 0) {
        toast.error('คะแนนต้องไม่เป็นค่าลบ');
        setIsApproving(false);
        return;
      }

      if (points > MAX_POINTS_AWARD) {
        toast.error(`คะแนนต้องไม่เกิน ${MAX_POINTS_AWARD.toLocaleString()} คะแนน`);
        setIsApproving(false);
        return;
      }

      const { error: receiptError } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          points_awarded: points,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReceipt.id);

      if (receiptError) throw receiptError;

      // Add points to user if points are awarded
      if (points > 0) {
        const { error: pointsError } = await supabase.rpc('add_points', {
          p_profile_id: selectedReceipt.profile_id,
          p_amount: points,
          p_source: 'receipt',
          p_description: `คะแนนจากใบเสร็จ`,
        });

        if (pointsError) throw pointsError;
      }

      toast.success('อนุมัติใบเสร็จสำเร็จ');
      setSelectedReceipt(null);
      setPointsToAward('');
      setAdminNotes('');
      fetchReceipts();
    } catch (error) {
      console.error('Error approving receipt:', error);
      toast.error('ไม่สามารถอนุมัติใบเสร็จได้');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReceipt) return;

    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('receipts')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReceipt.id);

      if (error) throw error;

      toast.success('ปฏิเสธใบเสร็จสำเร็จ');
      setSelectedReceipt(null);
      setAdminNotes('');
      fetchReceipts();
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      toast.error('ไม่สามารถปฏิเสธใบเสร็จได้');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">อนุมัติใบเสร็จ</h1>
        <p className="text-muted-foreground">ตรวจสอบและอนุมัติใบเสร็จจากสมาชิก</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="pending">รอตรวจสอบ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่ส่ง</TableHead>
                  <TableHead>สมาชิก</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>คะแนนที่ให้</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-12 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่พบใบเสร็จ
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        {new Date(receipt.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {receipt.profile?.first_name} {receipt.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {receipt.profile?.member_id || '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {receipt.amount ? `฿${receipt.amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabels[receipt.status]?.variant || 'secondary'}>
                          {statusLabels[receipt.status]?.label || receipt.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receipt.points_awarded?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedReceipt(receipt);
                                setPointsToAward(receipt.points_awarded?.toString() || '');
                                setAdminNotes(receipt.admin_notes || '');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>รายละเอียดใบเสร็จ</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                              {/* Receipt Image */}
                              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center relative group">
                                {receipt.image_url ? (
                                  <>
                                    <img
                                      src={receipt.image_url}
                                      alt="Receipt"
                                      className="max-w-full max-h-full object-contain cursor-pointer"
                                      onClick={() => setLightboxOpen(true)}
                                    />
                                    <button
                                      onClick={() => setLightboxOpen(true)}
                                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
                                    >
                                      <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                    <RewardImageLightbox
                                      images={[receipt.image_url]}
                                      initialIndex={0}
                                      open={lightboxOpen}
                                      onOpenChange={setLightboxOpen}
                                      rewardName="ใบเสร็จ"
                                    />
                                  </>
                                ) : (
                                  <div className="text-muted-foreground flex flex-col items-center">
                                    <ImageIcon className="h-12 w-12 mb-2" />
                                    <p>ไม่มีรูปภาพ</p>
                                  </div>
                                )}
                              </div>

                              {/* Receipt Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">สมาชิก</p>
                                  <p className="font-medium">
                                    {receipt.profile?.first_name} {receipt.profile?.last_name}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">จำนวนเงิน</p>
                                  <p className="font-medium">
                                    {receipt.amount ? `฿${receipt.amount.toLocaleString()}` : '-'}
                                  </p>
                                </div>
                              </div>

                              {receipt.status === 'pending' && (
                                <>
                                  <div className="space-y-2">
                                    <Label>คะแนนที่ให้</Label>
                                    <Input
                                      type="number"
                                      placeholder="ระบุคะแนน"
                                      value={pointsToAward}
                                      onChange={(e) => setPointsToAward(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>หมายเหตุ</Label>
                                    <Textarea
                                      placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                    />
                                  </div>
                                </>
                              )}

                              {receipt.status !== 'pending' && receipt.admin_notes && (
                                <div>
                                  <p className="text-sm text-muted-foreground">หมายเหตุ Admin</p>
                                  <p className="font-medium">{receipt.admin_notes}</p>
                                </div>
                              )}
                            </div>

                            {receipt.status === 'pending' && (
                              <DialogFooter>
                                <Button
                                  variant="destructive"
                                  onClick={handleReject}
                                  disabled={isApproving}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  ปฏิเสธ
                                </Button>
                                <Button
                                  onClick={handleApprove}
                                  disabled={isApproving}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  อนุมัติ
                                </Button>
                              </DialogFooter>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
