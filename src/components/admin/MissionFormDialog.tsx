import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Target, Users, QrCode, GripVertical, X, PlusCircle, ClipboardList } from 'lucide-react';
import { SurveyEditor, SurveyQuestion } from '@/components/admin/SurveyEditor';
import { MEMBER_TYPE_OPTIONS as MEMBER_TYPES, MEMBER_SUB_TYPES } from '@/constants/memberTypes';

interface RewardOverride {
  type: 'member_type' | 'tier';
  value: string;
  sub_type?: string;
  points: number;
}

interface MissionFormData {
  title: string;
  description: string;
  mission_type: string;
  points_reward: number;
  coins_reward: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  qr_code: string;
  location: string;
}

const MISSION_TYPES = [
  { value: 'qr_scan', label: 'สแกน QR Code', icon: QrCode },
  { value: 'location_visit', label: 'Check-in', icon: undefined },
  { value: 'survey', label: 'ทำแบบสำรวจ', icon: ClipboardList },
  { value: 'special', label: 'ภารกิจพิเศษ', icon: Target },
];

interface MissionFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  formData: MissionFormData;
  onFormDataChange: (data: MissionFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  // Targeting
  targetMemberTypes: string[];
  onTargetMemberTypesChange: (types: string[]) => void;
  targetSubTypes: Record<string, string[]>;
  onTargetSubTypesChange: (subTypes: Record<string, string[]>) => void;
  targetTiers: string[];
  onTargetTiersChange: (tiers: string[]) => void;
  dynamicTiers: { value: string; label: string }[];
  // Reward overrides
  rewardOverrides: RewardOverride[];
  onRewardOverridesChange: (overrides: RewardOverride[]) => void;
  // Survey
  surveyQuestions: SurveyQuestion[];
  onSurveyQuestionsChange: (questions: SurveyQuestion[]) => void;
}

export function MissionFormDialog({
  isOpen,
  onOpenChange,
  isEditing,
  formData,
  onFormDataChange,
  onSubmit,
  onReset,
  targetMemberTypes,
  onTargetMemberTypesChange,
  targetSubTypes,
  onTargetSubTypesChange,
  targetTiers,
  onTargetTiersChange,
  dynamicTiers,
  rewardOverrides,
  onRewardOverridesChange,
  surveyQuestions,
  onSurveyQuestionsChange,
}: MissionFormDialogProps) {

  const toggleArrayItem = (item: string, currentItems: string[], setter: (items: string[]) => void) => {
    if (currentItems.includes(item)) {
      setter(currentItems.filter(i => i !== item));
    } else {
      setter([...currentItems, item]);
    }
  };

  const addRewardOverride = () => {
    onRewardOverridesChange([...rewardOverrides, { type: 'tier', value: 'gold', points: 0 }]);
  };

  const removeRewardOverride = (index: number) => {
    const newOverrides = [...rewardOverrides];
    newOverrides.splice(index, 1);
    onRewardOverridesChange(newOverrides);
  };

  const updateRewardOverride = (index: number, field: keyof RewardOverride, value: string | number | boolean) => {
    const newOverrides = [...rewardOverrides];
    newOverrides[index] = { ...newOverrides[index], [field]: value };
    if (field === 'type' || field === 'value') {
      delete newOverrides[index].sub_type;
    }
    onRewardOverridesChange(newOverrides);
  };

  const setField = <K extends keyof MissionFormData>(key: K, value: MissionFormData[K]) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) onReset();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          สร้างภารกิจ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'แก้ไขภารกิจ' : 'สร้างภารกิจใหม่'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">

          {/* Basic Info */}
          <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
            <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> ข้อมูลทั่วไป</h3>
            <div className="space-y-2">
              <Label>ชื่อภารกิจ *</Label>
              <Input value={formData.title} onChange={e => setField('title', e.target.value)} placeholder="เช่น สแกน QR งาน Elanco Day" />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={formData.description} onChange={e => setField('description', e.target.value)} placeholder="อธิบายภารกิจ" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>ประเภทภารกิจ</Label>
              <Select value={formData.mission_type} onValueChange={v => setField('mission_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MISSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type Specific */}
          {(formData.mission_type === 'qr_scan' || formData.mission_type === 'location_visit') && (
            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
              <h3 className="font-semibold flex items-center gap-2"><QrCode className="w-4 h-4" /> การตรวจสอบ</h3>
              {formData.mission_type === 'qr_scan' && (
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <Input value={formData.qr_code} onChange={e => setField('qr_code', e.target.value)} placeholder="รหัส QR Code" />
                </div>
              )}
              {formData.mission_type === 'location_visit' && (
                <div className="space-y-2">
                  <Label>สถานที่</Label>
                  <Input value={formData.location} onChange={e => setField('location', e.target.value)} placeholder="ชื่อหรือพิกัดสถานที่" />
                </div>
              )}
            </div>
          )}

          {/* Survey Editor */}
          {(formData.mission_type === 'survey' || formData.mission_type === 'special') && (
            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
              <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4" /> คำถามแบบสำรวจ</h3>
              <SurveyEditor questions={surveyQuestions} onChange={onSurveyQuestionsChange} />
            </div>
          )}

          {/* Timing & Rewards */}
          <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
            <h3 className="font-semibold flex items-center gap-2"><GripVertical className="w-4 h-4" /> ระยะเวลาและรางวัลพื้นฐาน</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>คะแนนที่ได้รับ</Label>
                <Input type="number" min="0" value={formData.points_reward} onChange={e => setField('points_reward', parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>เหรียญที่ได้รับ</Label>
                <Input type="number" min="0" value={formData.coins_reward} onChange={e => setField('coins_reward', parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันเริ่มต้น</Label>
                <Input type="datetime-local" value={formData.start_date} onChange={e => setField('start_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>วันสิ้นสุด</Label>
                <Input type="datetime-local" value={formData.end_date} onChange={e => setField('end_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
            <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> กลุ่มเป้าหมาย (ว่าง = ทุกคน)</h3>
            <div className="space-y-3">
              <Label>ประเภทสมาชิกที่เข้าร่วมได้</Label>
              <div className="space-y-2">
                {MEMBER_TYPES.map(type => {
                  const subTypes = MEMBER_SUB_TYPES[type.value];
                  const isChecked = targetMemberTypes.includes(type.value);
                  return (
                    <div key={type.value}>
                      <div className="flex items-center space-x-2 border p-2 rounded bg-background">
                        <Checkbox
                          id={`member-${type.value}`}
                          checked={isChecked}
                          onCheckedChange={() => {
                            toggleArrayItem(type.value, targetMemberTypes, onTargetMemberTypesChange);
                            if (isChecked) {
                              onTargetSubTypesChange((() => {
                                const next = { ...targetSubTypes };
                                delete next[type.value];
                                return next;
                              })());
                            }
                          }}
                        />
                        <label htmlFor={`member-${type.value}`} className="text-sm font-medium leading-none cursor-pointer">
                          {type.label}
                        </label>
                        {subTypes && <span className="text-xs text-muted-foreground ml-auto">({subTypes.length} ประเภทย่อย)</span>}
                      </div>
                      {isChecked && subTypes && (
                        <div className="ml-6 mt-1 mb-2 pl-3 border-l-2 border-primary/30 space-y-1">
                          <p className="text-xs text-muted-foreground mb-1">เลือกประเภทย่อย (ว่าง = ทุกประเภทย่อย)</p>
                          {subTypes.map(sub => (
                            <div key={sub.value} className="flex items-center space-x-2 p-1.5 rounded bg-background/50">
                              <Checkbox
                                id={`sub-${type.value}-${sub.value}`}
                                checked={(targetSubTypes[type.value] || []).includes(sub.value)}
                                onCheckedChange={() => {
                                  const current = targetSubTypes[type.value] || [];
                                  const updated = current.includes(sub.value)
                                    ? current.filter(v => v !== sub.value)
                                    : [...current, sub.value];
                                  onTargetSubTypesChange({ ...targetSubTypes, [type.value]: updated });
                                }}
                              />
                              <label htmlFor={`sub-${type.value}-${sub.value}`} className="text-xs font-medium leading-none cursor-pointer">
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

            <div className="space-y-2 mt-4">
              <Label>ระดับสมาชิก (Tier) ที่เข้าร่วมได้</Label>
              <div className="flex flex-wrap gap-2">
                {dynamicTiers.map(tier => (
                  <div key={tier.value} className="flex items-center space-x-2 border p-2 rounded bg-background">
                    <Checkbox
                      id={`tier-${tier.value}`}
                      checked={targetTiers.includes(tier.value)}
                      onCheckedChange={() => toggleArrayItem(tier.value, targetTiers, onTargetTiersChange)}
                    />
                    <label htmlFor={`tier-${tier.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize">
                      {tier.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Rewards */}
          <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> คะแนนพิเศษ (Override)</h3>
              <Button type="button" size="sm" variant="outline" onClick={addRewardOverride}>
                <PlusCircle className="mr-2 h-4 w-4" /> เพิ่มกฎ
              </Button>
            </div>

            {rewardOverrides.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีกฎคะแนนพิเศษ (ใช้คะแนนพื้นฐาน)</p>
            )}

            <div className="space-y-3">
              {rewardOverrides.map((override, index) => {
                const overrideSubTypes = override.type === 'member_type' ? MEMBER_SUB_TYPES[override.value] : undefined;
                return (
                  <div key={index} className="p-3 bg-background border rounded-md space-y-2">
                    <div className="flex items-end gap-3">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">เงื่อนไข</Label>
                        <Select value={override.type} onValueChange={(v) => updateRewardOverride(index, 'type', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member_type">ประเภทสมาชิก</SelectItem>
                            <SelectItem value="tier">ระดับ (Tier)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">ค่า</Label>
                        <Select value={override.value} onValueChange={(v) => updateRewardOverride(index, 'value', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {override.type === 'member_type'
                              ? MEMBER_TYPES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)
                              : dynamicTiers.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 w-24">
                        <Label className="text-xs">คะแนน</Label>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={override.points}
                          onChange={(e) => updateRewardOverride(index, 'points', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRewardOverride(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {overrideSubTypes && overrideSubTypes.length > 0 && (
                      <div className="ml-4 pl-3 border-l-2 border-primary/30">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">ประเภทย่อย (ว่าง = ทุกประเภทย่อย)</Label>
                          <Select value={override.sub_type || '__all__'} onValueChange={(v) => updateRewardOverride(index, 'sub_type', v === '__all__' ? undefined : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">ทุกประเภทย่อย</SelectItem>
                              {overrideSubTypes.map(sub => (
                                <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Switch checked={formData.is_active} onCheckedChange={c => setField('is_active', c)} />
            <Label>เปิดใช้งานทันที</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onReset(); }}>ยกเลิก</Button>
            <Button type="submit">{isEditing ? 'บันทึกการแก้ไข' : 'สร้างภารกิจ'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { MissionFormData, RewardOverride };
