import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { MemberImportDialog } from '@/components/admin/MemberImportDialog';
import { MemberColumnsSelector, ColumnConfig } from '@/components/admin/MemberColumnsSelector';
import { MembersTable } from '@/components/admin/MembersTable';
import { BulkDeleteMembersDialog } from '@/components/admin/BulkDeleteMembersDialog';
import { downloadMembersCSV } from '@/lib/member-export';

interface Profile {
  id: string;
  user_id: string | null;
  member_id: string | null;
  first_name: string;
  last_name: string;
  nickname: string | null;
  member_type: string;
  approval_status: string;
  tier: string;
  total_points: number;
  total_coins: number;
  phone: string | null;
  created_at: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'member_id', label: 'รหัสสมาชิก', visible: true },
  { id: 'name', label: 'ชื่อ-นามสกุล', visible: true },
  { id: 'member_type', label: 'ประเภท', visible: true },
  { id: 'approval_status', label: 'สถานะ', visible: true },
  { id: 'tier', label: 'Tier', visible: true },
  { id: 'total_points', label: 'คะแนน', visible: true },
  { id: 'total_coins', label: 'เหรียญ', visible: true },
  { id: 'phone', label: 'เบอร์โทร', visible: false },
  { id: 'created_at', label: 'วันที่สมัคร', visible: false },
];

const statusLabels: Record<string, { label: string }> = {
  pending: { label: 'รอการอนุมัติ' },
  approved: { label: 'อนุมัติแล้ว' },
  rejected: { label: 'ไม่อนุมัติ' },
};

export default function AdminMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>('all');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter as 'pending' | 'approved' | 'rejected');
      }

      if (memberTypeFilter !== 'all') {
        query = query.eq('member_type', memberTypeFilter as 'farm' | 'company_employee' | 'veterinarian' | 'livestock_shop' | 'government' | 'other');
      }

      const { data, error } = await query;

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, memberTypeFilter]);

  const fetchAdminUserIds = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (data) {
        setAdminUserIds(new Set(data.map(r => r.user_id)));
      }
    } catch (error) {
      console.error('Error fetching admin roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchAdminUserIds();
  }, [fetchMembers, fetchAdminUserIds]);

  // Clear selection when members change
  useEffect(() => {
    setSelectedIds([]);
  }, [members]);

  const updateStatus = async (memberId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(`อัพเดทสถานะเป็น ${statusLabels[newStatus].label} สำเร็จ`);
      fetchMembers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ไม่สามารถอัพเดทสถานะได้');
    }
  };

  const filteredMembers = members.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.first_name?.toLowerCase().includes(searchLower) ||
      member.last_name?.toLowerCase().includes(searchLower) ||
      member.member_id?.toLowerCase().includes(searchLower) ||
      member.phone?.includes(searchQuery)
    );
  });

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadMembersCSV();
      toast.success('ส่งออกข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error exporting members:', error);
      toast.error('ไม่สามารถส่งออกข้อมูลได้');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleBulkDeleteComplete = useCallback(() => {
    setSelectedIds([]);
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการสมาชิก</h1>
          <p className="text-muted-foreground">ดูและจัดการข้อมูลสมาชิกทั้งหมด</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              ลบ {selectedIds.length} คน
            </Button>
          )}
          <Button variant="outline" onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isExporting ? 'กำลังส่งออก...' : 'Export CSV'}
          </Button>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Import สมาชิก
          </Button>
        </div>
      </div>

      <BulkDeleteMembersDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        selectedIds={selectedIds}
        onDeleteComplete={handleBulkDeleteComplete}
      />

      <MemberImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={fetchMembers}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยชื่อ, รหัสสมาชิก, หรือเบอร์โทร"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="pending">รอการอนุมัติ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={memberTypeFilter} onValueChange={setMemberTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="ประเภทสมาชิก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                <SelectItem value="farm">ฟาร์มปศุสัตว์</SelectItem>
                <SelectItem value="company_employee">พนักงานบริษัท</SelectItem>
                <SelectItem value="veterinarian">สัตวแพทย์</SelectItem>
                <SelectItem value="livestock_shop">ร้านค้าปศุสัตว์</SelectItem>
                <SelectItem value="government">รับราชการ</SelectItem>
                <SelectItem value="other">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
            <MemberColumnsSelector columns={columns} onColumnsChange={setColumns} />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <MembersTable
              members={filteredMembers}
              isLoading={isLoading}
              columns={columns}
              onUpdateStatus={updateStatus}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              adminUserIds={adminUserIds}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
