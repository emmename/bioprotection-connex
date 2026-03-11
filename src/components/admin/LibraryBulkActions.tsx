import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MEMBER_TYPE_OPTIONS, type MemberType, type TierLevel } from '@/constants/memberTypes';

interface LibraryBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  // Tiers
  isBulkEditTiersOpen: boolean;
  onBulkEditTiersOpenChange: (open: boolean) => void;
  bulkTiersValue: TierLevel[];
  onBulkTiersValueChange: (value: TierLevel[]) => void;
  onBulkEditTiers: () => void;
  dynamicTiers: { value: string; label: string }[];
  // Member Types
  isBulkEditMemberTypesOpen: boolean;
  onBulkEditMemberTypesOpenChange: (open: boolean) => void;
  bulkMemberTypesValue: MemberType[];
  onBulkMemberTypesValueChange: (value: MemberType[]) => void;
  onBulkEditMemberTypes: () => void;
  // Publish & Delete
  onBulkPublish: (isPublished: boolean) => void;
  onBulkDelete: () => void;
}

export function LibraryBulkActions({
  selectedCount,
  onClearSelection,
  isBulkEditTiersOpen,
  onBulkEditTiersOpenChange,
  bulkTiersValue,
  onBulkTiersValueChange,
  onBulkEditTiers,
  dynamicTiers,
  isBulkEditMemberTypesOpen,
  onBulkEditMemberTypesOpenChange,
  bulkMemberTypesValue,
  onBulkMemberTypesValueChange,
  onBulkEditMemberTypes,
  onBulkPublish,
  onBulkDelete,
}: LibraryBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <>
      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
        <span className="text-sm font-medium whitespace-nowrap">
          เลือก {selectedCount} รายการ
        </span>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onBulkEditMemberTypesOpenChange(true)} className="text-xs">
            แก้ไขกลุ่มเป้าหมาย (ประเภท)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onBulkEditTiersOpenChange(true)} className="text-xs">
            แก้ไขกลุ่มเป้าหมาย (ระดับ)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onBulkPublish(true)} className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50">
            เผยแพร่
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onBulkPublish(false)} className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50">
            ยกเลิกเผยแพร่
          </Button>
          <Button variant="ghost" size="sm" onClick={onBulkDelete} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
            ลบ
          </Button>
        </div>
        <div className="h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClearSelection}>
          <span className="sr-only">Close</span>x
        </Button>
      </div>

      {/* Bulk Edit Tiers Dialog */}
      <Dialog open={isBulkEditTiersOpen} onOpenChange={onBulkEditTiersOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขระดับกลุ่มเป้าหมาย (Tier) {selectedCount} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>สิทธิ์การเข้าถึงตามระดับสมาชิก (เลือกใหม่เพื่อเขียนทับ)</Label>
              <div className="flex flex-wrap gap-4">
                {dynamicTiers.map((tier) => (
                  <div key={tier.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-tier-${tier.value}`}
                      checked={bulkTiersValue.includes(tier.value as TierLevel)}
                      onCheckedChange={(checked) => {
                        if (checked) onBulkTiersValueChange([...bulkTiersValue, tier.value as TierLevel]);
                        else onBulkTiersValueChange(bulkTiersValue.filter(t => t !== tier.value));
                      }}
                    />
                    <Label htmlFor={`bulk-tier-${tier.value}`} className="text-sm font-normal cursor-pointer capitalize">
                      {tier.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">* หากไม่เลือกเลยจะหมายถึง "แสดงให้ทุกระดับเข้าถึงได้"</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkEditTiersOpenChange(false)}>ยกเลิก</Button>
            <Button onClick={onBulkEditTiers}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Member Types Dialog */}
      <Dialog open={isBulkEditMemberTypesOpen} onOpenChange={onBulkEditMemberTypesOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขประเภทกลุ่มเป้าหมาย {selectedCount} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>สิทธิ์การเข้าถึงตามประเภทสมาชิก (เลือกใหม่เพื่อเขียนทับ)</Label>
              <div className="flex flex-col gap-4">
                {MEMBER_TYPE_OPTIONS.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-type-${type.value}`}
                      checked={bulkMemberTypesValue.includes(type.value as MemberType)}
                      onCheckedChange={(checked) => {
                        if (checked) onBulkMemberTypesValueChange([...bulkMemberTypesValue, type.value as MemberType]);
                        else onBulkMemberTypesValueChange(bulkMemberTypesValue.filter(t => t !== type.value));
                      }}
                    />
                    <Label htmlFor={`bulk-type-${type.value}`} className="text-sm font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">* หากไม่เลือกเลยจะหมายถึง "แสดงให้ทุกประเภทเข้าถึงได้"</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkEditMemberTypesOpenChange(false)}>ยกเลิก</Button>
            <Button onClick={onBulkEditMemberTypes}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
