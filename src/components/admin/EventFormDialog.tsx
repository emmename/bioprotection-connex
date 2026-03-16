import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MEMBER_TYPE_OPTIONS as MEMBER_TYPES_OPTIONS, MEMBER_SUB_TYPES } from '@/constants/memberTypes';
import type { AdminEvent, EventReward } from './EventTable';

interface EventFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingEvent: AdminEvent | null;
    formData: {
        title: string;
        description: string;
        location: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
        is_visible: boolean;
        event_type: string;
        allowed_member_types: string[];
        allowed_sub_types: Record<string, string[]>;
        allowed_tiers: string[];
        rewards: EventReward[];
    };
    setFormData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isSaving: boolean;
    tierOptions: { label: string; value: string }[];
}

export function EventFormDialog({
    open,
    onOpenChange,
    editingEvent,
    formData,
    setFormData,
    onSubmit,
    isSaving,
    tierOptions,
}: EventFormDialogProps) {

    const handleToggleMemberType = (type: string) => {
        const isChecked = formData.allowed_member_types.includes(type);
        let newTypes = [];
        const newSubTypes = { ...formData.allowed_sub_types };
        if (isChecked) {
            newTypes = formData.allowed_member_types.filter(t => t !== type);
            delete newSubTypes[type];
        } else {
            newTypes = [...formData.allowed_member_types, type];
        }
        setFormData({ ...formData, allowed_member_types: newTypes, allowed_sub_types: newSubTypes });
    };

    const handleToggleSubType = (type: string, subType: string) => {
        const current = formData.allowed_sub_types[type] || [];
        const updated = current.includes(subType)
            ? current.filter(v => v !== subType)
            : [...current, subType];
        setFormData({ ...formData, allowed_sub_types: { ...formData.allowed_sub_types, [type]: updated } });
    };

    const handleToggleTier = (tier: string) => {
        setFormData({
            ...formData,
            allowed_tiers: formData.allowed_tiers.includes(tier)
                ? formData.allowed_tiers.filter(t => t !== tier)
                : [...formData.allowed_tiers, tier]
        });
    };

    const addRewardConfig = () => {
        setFormData({
            ...formData,
            rewards: [...formData.rewards, { member_type: null, tier_name: null, points_reward: 0, coins_reward: 0 }]
        });
    };

    const updateRewardConfig = (index: number, field: keyof EventReward, value: any) => {
        const newRewards = [...formData.rewards];
        if (field === 'member_type' && value === 'all') value = null;
        if (field === 'tier_name' && value === 'all') value = null;
        newRewards[index] = { ...newRewards[index], [field]: value };
        setFormData({ ...formData, rewards: newRewards });
    };

    const removeRewardConfig = (index: number) => {
        const newRewards = [...formData.rewards];
        newRewards.splice(index, 1);
        setFormData({ ...formData, rewards: newRewards });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingEvent ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</DialogTitle>
                    <DialogDescription>
                        กำหนดรายละเอียดของกิจกรรม รูปแบบการเข้าถึง และของรางวัลเมื่อสแกนเข้างาน
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">ข้อมูลพื้นฐาน</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อกิจกรรม <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="เช่น การอบรมพนักงานขาย 2024"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event_type">ประเภทกิจกรรม</Label>
                                <Select
                                    value={formData.event_type}
                                    onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกประเภทกิจกรรม" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general_event">กิจกรรมทั่วไป</SelectItem>
                                        <SelectItem value="mission_event">ภารกิจพิเศษ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">รายละเอียดกิจกรรม</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="รายละเอียด หัวข้อการอบรม..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">วัน-เวลาเริ่ม <span className="text-red-500">*</span></Label>
                                <Input
                                    id="start_date"
                                    type="datetime-local"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">วัน-เวลาสิ้นสุด <span className="text-red-500">*</span></Label>
                                <Input
                                    id="end_date"
                                    type="datetime-local"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location">สถานที่จัดกิจกรรม</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="เช่น โรงแรม... ห้องประชุม..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="is_active">สถานะกิจกรรม</Label>
                                <Select
                                    value={formData.is_active ? 'active' : 'inactive'}
                                    onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">เปิดใช้งาน</SelectItem>
                                        <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-md bg-amber-50 border-amber-200">
                            <Checkbox
                                id="is_visible"
                                checked={formData.is_visible}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_visible: !!checked })}
                            />
                            <div>
                                <label htmlFor="is_visible" className="text-sm font-medium cursor-pointer">
                                    แสดงแก่สมาชิก
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    หากปิด สมาชิกจะไม่เห็นกิจกรรมนี้และต้องใช้ "QR ของฉัน" ในการเช็คอินแทน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-t pt-4">สิทธิ์การเข้าถึง (Access Control)</h3>
                        <p className="text-sm text-muted-foreground">หากไม่เลือก ระบบจะอนุญาตให้ทุกคนเข้าถึงกิจกรรมได้</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label>ประเภทสมาชิกที่อนุญาต</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {MEMBER_TYPES_OPTIONS.map(opt => {
                                        const subTypes = MEMBER_SUB_TYPES[opt.value];
                                        const isChecked = formData.allowed_member_types.includes(opt.value);
                                        return (
                                            <div key={opt.value} className="space-y-2 border p-2 rounded bg-background">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`member_${opt.value}`}
                                                        checked={isChecked}
                                                        onCheckedChange={() => handleToggleMemberType(opt.value)}
                                                    />
                                                    <label htmlFor={`member_${opt.value}`} className="text-sm font-medium cursor-pointer flex-1">
                                                        {opt.label}
                                                    </label>
                                                    {subTypes && <span className="text-xs text-muted-foreground mr-2">({subTypes.length} ประเภทย่อย)</span>}
                                                </div>

                                                {isChecked && subTypes && (
                                                    <div className="ml-6 mt-1 pl-3 border-l-2 border-primary/30 space-y-1">
                                                        <p className="text-xs text-muted-foreground mb-1">เลือกประเภทย่อย (ว่าง = ทุกประเภทย่อย)</p>
                                                        {subTypes.map(sub => (
                                                            <div key={sub.value} className="flex items-center space-x-2 p-1 rounded hover:bg-slate-50">
                                                                <Checkbox
                                                                    id={`sub_${opt.value}_${sub.value}`}
                                                                    checked={(formData.allowed_sub_types[opt.value] || []).includes(sub.value)}
                                                                    onCheckedChange={() => handleToggleSubType(opt.value, sub.value)}
                                                                />
                                                                <label htmlFor={`sub_${opt.value}_${sub.value}`} className="text-sm cursor-pointer">
                                                                    {sub.label}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label>ระดับสมาชิก (Tier) ที่อนุญาต</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {tierOptions.map(opt => (
                                        <div key={opt.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`tier_${opt.value}`}
                                                checked={formData.allowed_tiers.includes(opt.value)}
                                                onCheckedChange={() => handleToggleTier(opt.value)}
                                            />
                                            <label htmlFor={`tier_${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-t pt-4">
                            <div>
                                <h3 className="text-lg font-semibold">การให้รางวัลเมื่อสแกนเข้างาน</h3>
                                <p className="text-sm text-muted-foreground">กำหนดคะแนน/เหรียญที่แจกให้แต่ละกลุ่ม (เว้นว่าง = ได้รับทุกคนที่มีสิทธิ์ร่วมงาน)</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addRewardConfig}>
                                <Plus className="w-4 h-4 mr-2" />
                                เพิ่มเงื่อนไขรางวัล
                            </Button>
                        </div>

                        {formData.rewards.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground bg-slate-50 rounded-md">
                                ยังไม่มีการกำหนดเงื่อนไขรางวัล (กิจกรรมนี้จะไม่มีการแจกคะแนน/เหรียญเมื่อเช็คอิน)
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {formData.rewards.map((reward, index) => (
                                    <div key={index} className="flex items-end gap-3 p-3 border rounded-md bg-slate-50 relative">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500"
                                            onClick={() => removeRewardConfig(index)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                        <div className="grid grid-cols-4 gap-3 w-full pt-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">ประเภทสมาชิก</Label>
                                                <Select
                                                    value={reward.member_type || 'all'}
                                                    onValueChange={(val) => updateRewardConfig(index, 'member_type', val)}
                                                >
                                                    <SelectTrigger className="h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                                        {MEMBER_TYPES_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">ระดับสมาชิก (Tier)</Label>
                                                <Select
                                                    value={reward.tier_name || 'all'}
                                                    onValueChange={(val) => updateRewardConfig(index, 'tier_name', val)}
                                                >
                                                    <SelectTrigger className="h-8 text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                                        {tierOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">คะแนนที่ได้</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-sm"
                                                    value={reward.points_reward}
                                                    onChange={(e) => updateRewardConfig(index, 'points_reward', Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">เหรียญที่ได้</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-sm"
                                                    value={reward.coins_reward}
                                                    onChange={(e) => updateRewardConfig(index, 'coins_reward', Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-6 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
