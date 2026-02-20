import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { CheckCircle, XCircle, Eye, ArrowUpDown, ArrowUp, ArrowDown, Shield } from 'lucide-react';
import { ColumnConfig } from './MemberColumnsSelector';

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

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

const memberTypeLabels: Record<string, string> = {
  farm: 'ฟาร์มเลี้ยงสัตว์',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านค้าปศุสัตว์',
  government: 'รับราชการ',
  other: 'อื่นๆ',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'รอการอนุมัติ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ไม่อนุมัติ', variant: 'destructive' },
};

interface MembersTableProps {
  members: Profile[];
  isLoading: boolean;
  columns: ColumnConfig[];
  onUpdateStatus: (memberId: string, newStatus: 'pending' | 'approved' | 'rejected') => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  adminUserIds?: Set<string>;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function MembersTable({ members, isLoading, columns, onUpdateStatus, selectedIds, onSelectionChange, adminUserIds }: MembersTableProps) {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const isAllSelected = members.length > 0 && selectedIds.length === members.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < members.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(members.map(m => m.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const visibleColumns = columns.filter(c => c.visible);

  const handleSort = (columnId: string) => {
    setSortConfig(prev => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: '', direction: null };
      }
      return { column: columnId, direction: 'asc' };
    });
  };

  const getSortIcon = (columnId: string) => {
    if (sortConfig.column !== columnId) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-3 w-3 ml-1" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedMembers = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return members;
    }

    return [...members].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortConfig.column) {
        case 'member_id':
          aValue = a.member_id || '';
          bValue = b.member_id || '';
          break;
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`;
          bValue = `${b.first_name} ${b.last_name}`;
          break;
        case 'member_type':
          aValue = memberTypeLabels[a.member_type] || a.member_type;
          bValue = memberTypeLabels[b.member_type] || b.member_type;
          break;
        case 'approval_status':
          aValue = statusLabels[a.approval_status]?.label || a.approval_status;
          bValue = statusLabels[b.approval_status]?.label || b.approval_status;
          break;
        case 'tier':
          aValue = a.tier;
          bValue = b.tier;
          break;
        case 'total_points':
          aValue = a.total_points;
          bValue = b.total_points;
          break;
        case 'total_coins':
          aValue = a.total_coins;
          bValue = b.total_coins;
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue), 'th');
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [members, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedMembers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedMembers = sortedMembers.slice(startIndex, endIndex);

  // Reset to page 1 when members change or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [members.length, pageSize]);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const renderCellContent = (member: Profile, columnId: string) => {
    switch (columnId) {
      case 'member_id':
        return <span className="font-mono text-sm">{member.member_id || '-'}</span>;
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <div>
              <p className="font-medium">{member.first_name} {member.last_name}</p>
              {member.nickname && (
                <p className="text-sm text-muted-foreground">({member.nickname})</p>
              )}
            </div>
            {member.user_id && adminUserIds?.has(member.user_id) && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-500/80 text-white text-[10px] px-1.5 py-0 gap-1">
                <Shield className="h-3 w-3" />
                แอดมิน
              </Badge>
            )}
          </div>
        );
      case 'member_type':
        return (
          <Badge variant="outline">
            {memberTypeLabels[member.member_type] || member.member_type}
          </Badge>
        );
      case 'approval_status':
        return (
          <Badge variant={statusLabels[member.approval_status]?.variant || 'secondary'}>
            {statusLabels[member.approval_status]?.label || member.approval_status}
          </Badge>
        );
      case 'tier':
        return <span className="capitalize">{member.tier}</span>;
      case 'total_points':
        return member.total_points.toLocaleString();
      case 'total_coins':
        return member.total_coins.toLocaleString();
      case 'phone':
        return member.phone || '-';
      case 'created_at':
        return new Date(member.created_at).toLocaleDateString('th-TH');
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox disabled />
            </TableHead>
            {visibleColumns.map(col => (
              <TableHead key={col.id}>{col.label}</TableHead>
            ))}
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={visibleColumns.length + 2}>
                <div className="h-12 bg-muted animate-pulse rounded"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (sortedMembers.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox disabled />
            </TableHead>
            {visibleColumns.map(col => (
              <TableHead key={col.id}>{col.label}</TableHead>
            ))}
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={visibleColumns.length + 2} className="text-center py-8 text-muted-foreground">
              ไม่พบข้อมูลสมาชิก
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement).dataset.state = isPartiallySelected ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked');
                  }
                }}
                onCheckedChange={handleSelectAll}
                aria-label="เลือกทั้งหมด"
              />
            </TableHead>
            {visibleColumns.map(col => (
              <TableHead key={col.id}>
                <button
                  className="flex items-center hover:text-foreground transition-colors"
                  onClick={() => handleSort(col.id)}
                >
                  {col.label}
                  {getSortIcon(col.id)}
                </button>
              </TableHead>
            ))}
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedMembers.map((member) => (
            <TableRow key={member.id} data-state={selectedIds.includes(member.id) ? 'selected' : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(member.id)}
                  onCheckedChange={(checked) => handleSelectOne(member.id, !!checked)}
                  aria-label={`เลือก ${member.first_name} ${member.last_name}`}
                />
              </TableCell>
              {visibleColumns.map(col => (
                <TableCell key={col.id}>
                  {renderCellContent(member, col.id)}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/admin/members/${member.id}`)}
                    title="ดูรายละเอียด"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {member.approval_status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-success hover:text-success"
                        onClick={() => onUpdateStatus(member.id, 'approved')}
                        title="อนุมัติ"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onUpdateStatus(member.id, 'rejected')}
                        title="ไม่อนุมัติ"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>แสดง</span>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(size => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>รายการ | {startIndex + 1}-{Math.min(endIndex, sortedMembers.length)} จาก {sortedMembers.length} รายการ</span>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {getPageNumbers().map((page, index) => (
                <PaginationItem key={index}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
