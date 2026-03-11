import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { TierLevel } from '@/constants/memberTypes';

interface ContentBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  // Points
  isBulkEditPointsOpen: boolean;
  onBulkEditPointsOpenChange: (open: boolean) => void;
  bulkPointsValue: number;
  onBulkPointsValueChange: (value: number) => void;
  onBulkEditPoints: () => void;
  // Tiers
  isBulkEditTiersOpen: boolean;
  onBulkEditTiersOpenChange: (open: boolean) => void;
  bulkTiersValue: TierLevel[];
  onBulkTiersValueChange: (value: TierLevel[]) => void;
  onBulkEditTiers: () => void;
  dynamicTiers: { value: string; label: string }[];
  // Publish & Delete
  onBulkPublish: (isPublished: boolean) => void;
  onBulkDelete: () => void;
}

export function ContentBulkActions({
  selectedCount,
  onClearSelection,
  isBulkEditPointsOpen,
  onBulkEditPointsOpenChange,
  bulkPointsValue,
  onBulkPointsValueChange,
  onBulkEditPoints,
  isBulkEditTiersOpen,
  onBulkEditTiersOpenChange,
  bulkTiersValue,
  onBulkTiersValueChange,
  onBulkEditTiers,
  dynamicTiers,
  onBulkPublish,
  onBulkDelete,
}: ContentBulkActionsProps) {
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
          <Button variant="ghost" size="sm" onClick={() => onBulkEditPointsOpenChange(true)} className="text-xs">
            แก้ไขคะแนน
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onBulkEditTiersOpenChange(true)} className="text-xs">
            แก้ไข Tier
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => onBulkPublish(true)}
            className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            เผยแพร่
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => onBulkPublish(false)}
            className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            ยกเลิกเผยแพร่
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onBulkDelete}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            ลบ
          </Button>
        </div>
        <div className="h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={onClearSelection}
        >
          <span className="sr-only">Close</span>
          x
        </Button>
      </div>

      {/* Bulk Edit Points Dialog */}
      <Dialog open={isBulkEditPointsOpen} onOpenChange={onBulkEditPointsOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>แก้ไขคะแนน {selectedCount} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>คะแนนใหม่</Label>
              <Input
                type="number"
                value={bulkPointsValue}
                onChange={(e) => onBulkPointsValueChange(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                เนื้อหาที่เลือกทั้งหมดจะถูกตั้งค่าคะแนนเป็นจำนวนนี้
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkEditPointsOpenChange(false)}>ยกเลิก</Button>
            <Button onClick={onBulkEditPoints}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Tiers Dialog */}
      <Dialog open={isBulkEditTiersOpen} onOpenChange={onBulkEditTiersOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไข Tier {selectedCount} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>สิทธิ์การเข้าถึงตาม Tier (เลือกใหม่เพื่อเขียนทับ)</Label>
              <div className="flex flex-wrap gap-4">
                {dynamicTiers.map((tier) => (
                  <div key={tier.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-tier-${tier.value}`}
                      checked={bulkTiersValue.includes(tier.value as TierLevel)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onBulkTiersValueChange([...bulkTiersValue, tier.value as TierLevel]);
                        } else {
                          onBulkTiersValueChange(bulkTiersValue.filter(t => t !== tier.value));
                        }
                      }}
                    />
                    <Label htmlFor={`bulk-tier-${tier.value}`} className="text-sm font-normal cursor-pointer">
                      {tier.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * หากไม่เลือกเลยจะหมายถึง "ทุก Tier เข้าถึงได้"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkEditTiersOpenChange(false)}>ยกเลิก</Button>
            <Button onClick={onBulkEditTiers}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
