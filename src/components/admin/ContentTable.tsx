import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Eye, Edit, Trash2, FileText, Video, HelpCircle, ClipboardList } from 'lucide-react';
import { MEMBER_TYPE_OPTIONS, MEMBER_SUB_TYPES } from '@/constants/memberTypes';
import { useState } from 'react';

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'article' | 'video' | 'quiz' | 'survey';
  is_published: boolean;
  points_reward: number;
  target_tiers: string[] | null;
  target_member_types: string[] | null;
  created_at: string;
  updated_at: string;
  requirements?: {
    targeting?: {
      member_types?: string[];
      sub_types?: Record<string, string[]>;
      tiers?: string[];
    };
    [key: string]: unknown;
  } | null;
}

const contentTypeLabels: Record<string, { label: string; icon: typeof FileText }> = {
  article: { label: 'บทความ', icon: FileText },
  video: { label: 'วิดีโอ', icon: Video },
  quiz: { label: 'แบบทดสอบ', icon: HelpCircle },
  survey: { label: 'แบบสำรวจ', icon: ClipboardList },
};

const CONTENT_TYPE_BADGE_CLASSES: Record<string, string> = {
  article: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  video: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  quiz: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  survey: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
};

interface ContentTableProps {
  contents: Content[];
  isLoading: boolean;
  tierSettings: Array<{ tier: string; display_name?: string; color?: string }> | undefined;
  dynamicTiers: { value: string; label: string }[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onEdit: (content: Content) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (content: Content) => void;
  onPreview: (content: Content) => void;
  onQuickUpdate: (id: string, updates: Partial<Content>) => void;
}

function InlinePointsEdit({ content, onQuickUpdate }: { content: Content; onQuickUpdate: (id: string, updates: Partial<Content>) => void }) {
  const [value, setValue] = useState(content.points_reward.toString());
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = () => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue !== content.points_reward) {
      onQuickUpdate(content.id, { points_reward: numValue });
    } else {
      setValue(content.points_reward.toString());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') {
            setValue(content.points_reward.toString());
            setIsEditing(false);
          }
        }}
        className="w-20 h-8"
        autoFocus
      />
    );
  }

  return (
    <div
      className="cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
      onClick={() => setIsEditing(true)}
      title="คลิกเพื่อแก้ไข"
    >
      {content.points_reward}
    </div>
  );
}

function InlineTiersEdit({ content, dynamicTiers, onQuickUpdate }: {
  content: Content;
  dynamicTiers: { value: string; label: string }[];
  onQuickUpdate: (id: string, updates: Partial<Content>) => void;
}) {
  const currentTiers = content.target_tiers || [];
  const isAllTiers = currentTiers.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer hover:bg-muted/50 p-1 rounded min-h-[2rem] flex items-center">
          {isAllTiers ? (
            <span className="text-xs text-muted-foreground">ทุก Tier</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {currentTiers.map((tier) => (
                <Badge key={tier} variant="secondary" className="text-xs capitalize pointer-events-none">
                  {tier}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <div className="space-y-3">
          <h4 className="font-medium leading-none text-sm">แก้ไขสิทธิ์การเข้าถึง</h4>
          <div className="space-y-2">
            {dynamicTiers.map((tier) => {
              const isSelected = currentTiers.includes(tier.value);
              return (
                <div key={tier.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`inline-tier-${content.id}-${tier.value}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      let newTiers: string[];
                      if (checked) {
                        newTiers = [...currentTiers, tier.value];
                      } else {
                        newTiers = currentTiers.filter(t => t !== tier.value);
                      }
                       
                      onQuickUpdate(content.id, { target_tiers: newTiers.length > 0 ? newTiers : null });
                    }}
                  />
                  <Label
                    htmlFor={`inline-tier-${content.id}-${tier.value}`}
                    className="text-sm font-normal cursor-pointer w-full"
                  >
                    {tier.label}
                  </Label>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground pt-2 border-t">
            * ไม่เลือกเลย = ทุก Tier
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ContentTable({
  contents,
  isLoading,
  tierSettings,
  dynamicTiers,
  selectedIds,
  onSelectAll,
  onSelect,
  onEdit,
  onDelete,
  onTogglePublish,
  onPreview,
  onQuickUpdate,
}: ContentTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={contents.length > 0 && selectedIds.length === contents.length}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>ชื่อเนื้อหา</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>กลุ่มเป้าหมาย</TableHead>
                <TableHead>คะแนน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่สร้าง</TableHead>
                <TableHead className="text-right">การดำเนินการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-12 bg-muted animate-pulse rounded"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : contents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    ไม่พบเนื้อหา
                  </TableCell>
                </TableRow>
              ) : (
                contents.map((content) => {
                  const TypeIcon = contentTypeLabels[content.content_type]?.icon || FileText;
                  return (
                    <TableRow key={content.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(content.id)}
                          onCheckedChange={(checked) => onSelect(content.id, !!checked)}
                          aria-label={`Select ${content.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{content.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CONTENT_TYPE_BADGE_CLASSES[content.content_type] || ''}>
                          {contentTypeLabels[content.content_type]?.label || content.content_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {/* Member Types */}
                          {content.target_member_types && content.target_member_types.length > 0 ? (
                            <div className="flex flex-col gap-1.5 w-full">
                              {content.target_member_types.map((type) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const parsedReqs = content.requirements as Record<string, any>;
                                const subTypes = parsedReqs?.targeting?.sub_types?.[type] || [];
                                return (
                                  <div key={type} className="border border-border/50 rounded p-1.5 bg-background">
                                    <div className="text-[11px] font-medium text-foreground leading-none">
                                      {MEMBER_TYPE_OPTIONS.find(t => t.value === type)?.label || type}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {subTypes.length > 0 ? (
                                        subTypes.map((sub: string) => (
                                          <Badge key={sub} variant="secondary" className="text-[9px] px-1 py-0 h-4 font-normal bg-secondary/60 text-secondary-foreground leading-none flex items-center">
                                            {MEMBER_SUB_TYPES[type]?.find(s => s.value === sub)?.label || sub}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground leading-none">ทุกประเภทย่อย</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">ทุกประเภท</span>
                          )}
                          {/* Tiers */}
                          {content.target_tiers && content.target_tiers.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {content.target_tiers.map((tier) => {
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
                        <InlinePointsEdit content={content} onQuickUpdate={onQuickUpdate} />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={content.is_published}
                          onCheckedChange={() => onTogglePublish(content)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(content.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onPreview(content)} title="ดูตัวอย่าง">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(content)} title="แก้ไข">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(content.id)}
                            title="ลบ"
                          >
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
        </div>
      </CardContent>
    </Card>
  );
}

export type { Content };
