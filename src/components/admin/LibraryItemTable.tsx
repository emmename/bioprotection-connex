import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Pencil, Trash2, BookOpen, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { MEMBER_TYPE_OPTIONS } from '@/constants/memberTypes';

export interface LibraryItem {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  item_type: 'article' | 'image' | 'pdf' | 'video';
  content_body: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  sort_order: number;
  target_tiers: string[] | null;
  target_member_types: string[] | null;
  created_at: string;
}

export interface LibraryCategory {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const ITEM_TYPES = [
  { value: 'article', label: 'บทความ', icon: BookOpen },
  { value: 'image', label: 'รูปภาพ', icon: ImageIcon },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'video', label: 'วิดีโอ', icon: Video },
];

const ITEM_TYPE_BADGE_CLASSES: Record<string, string> = {
  article: 'bg-blue-50 text-blue-700 border-blue-200',
  image: 'bg-green-50 text-green-700 border-green-200',
  pdf: 'bg-orange-50 text-orange-700 border-orange-200',
  video: 'bg-red-50 text-red-700 border-red-200',
};

interface LibraryItemTableProps {
  items: LibraryItem[];
  categories: LibraryCategory[];
  tierSettings: Array<{ tier: string; display_name?: string; color?: string }> | undefined;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (item: LibraryItem) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (item: LibraryItem) => void;
  onPreview: (item: LibraryItem) => void;
}

export function LibraryItemTable({
  items,
  categories,
  tierSettings,
  selectedIds,
  onSelectAll,
  onSelect,
  onEdit,
  onDelete,
  onTogglePublish,
  onPreview,
}: LibraryItemTableProps) {
  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.id === categoryId)?.name || 'ไม่ระบุ';

  const getItemTypeLabel = (type: string) =>
    ITEM_TYPES.find(t => t.value === type)?.label || type;

  const getItemTypeIcon = (type: string) => {
    const found = ITEM_TYPES.find(t => t.value === type);
    return found ? found.icon : BookOpen;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={items.length > 0 && selectedIds.length === items.length}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="w-[80px]">ภาพ</TableHead>
            <TableHead>ชื่อเนื้อหา</TableHead>
            <TableHead>หมวดหมู่</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>กลุ่มเป้าหมาย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>วันที่สร้าง</TableHead>
            <TableHead className="text-right">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                ยังไม่มีเนื้อหา
              </TableCell>
            </TableRow>
          ) : (
            items.map(item => {
              const TypeIcon = getItemTypeIcon(item.item_type);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => onSelect(item.id, !!checked)}
                      aria-label={`Select ${item.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="w-16 h-10 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <TypeIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[250px]">
                    <p className="truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getCategoryName(item.category_id)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ITEM_TYPE_BADGE_CLASSES[item.item_type] || ''}>
                      {getItemTypeLabel(item.item_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-[200px]">
                      {item.target_member_types && item.target_member_types.length > 0 ? (
                        <div className="flex flex-col gap-1.5 w-full">
                          {item.target_member_types.map((type) => (
                            <div key={type} className="border border-border/50 rounded p-1.5 bg-background">
                              <div className="text-[11px] font-medium text-foreground leading-none">
                                {MEMBER_TYPE_OPTIONS.find(t => t.value === type)?.label || type}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">ทุกประเภท</span>
                      )}
                      {item.target_tiers && item.target_tiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.target_tiers.map((tier) => {
                            const matchedTier = tierSettings?.find(t => t.tier === tier);
                            const displayName = matchedTier?.display_name || tier;
                            const customColor = matchedTier?.color;
                            const badgeClass = customColor ? '' : (tier === 'platinum' ? 'bg-purple-600 text-white' : tier === 'gold' ? 'bg-yellow-500 text-white' : tier === 'silver' ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white');
                            return (
                              <Badge
                                key={tier}
                                className={`text-[10px] px-1 h-fit border-0 capitalize ${badgeClass}`}
                                style={customColor ? { backgroundColor: customColor, color: '#fff' } : undefined}
                              >
                                {displayName}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">ทุกระดับ</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={item.is_published} onCheckedChange={() => onTogglePublish(item)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('th-TH')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onPreview(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
