import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Target, Users, MapPin, QrCode, Search, GripVertical, X, PlusCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MissionCompletionsDialog } from '@/components/admin/MissionCompletionsDialog';
import { useTierSettings } from '@/hooks/useGamification';
import { SurveyEditor, SurveyQuestion } from '@/components/admin/SurveyEditor';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  mission_type: string;
  points_reward: number;
  coins_reward: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  qr_code: string | null;
  location: string | null;
  created_at: string;
  completion_count?: number;
  requirements?: {
    targeting?: {
      member_types?: string[];
      sub_types?: Record<string, string[]>;
      tiers?: string[];
    };
    reward_overrides?: Array<{ type: string; value: string; sub_type?: string; points: number; coins: number }>;
    [key: string]: unknown;
  } | null;
}

const MISSION_TYPES = [
  { value: 'qr_scan', label: 'สแกน QR Code', icon: QrCode },
  { value: 'location_visit', label: 'เยี่ยมชมสถานที่', icon: MapPin },
  { value: 'survey', label: 'ทำแบบสำรวจ', icon: ClipboardList },
  { value: 'special', label: 'ภารกิจพิเศษ', icon: Target },
];

const MEMBER_TYPES = [
  { value: 'farm', label: 'ฟาร์มเลี้ยงสัตว์' },
  { value: 'company_employee', label: 'พนักงานบริษัท' },
  { value: 'veterinarian', label: 'สัตวแพทย์' },
  { value: 'livestock_shop', label: 'ร้านค้าปศุสัตว์' },
];

// Sub-types matching registration system (OccupationStep.tsx)
const MEMBER_SUB_TYPES: Record<string, { value: string; label: string }[]> = {
  farm: [
    { value: 'owner', label: 'เจ้าของกิจการ' },
    { value: 'farm_manager', label: 'ผู้จัดการฟาร์ม' },
    { value: 'animal_husbandry', label: 'สัตวบาล' },
    { value: 'admin', label: 'ธุรการ' },
    { value: 'other', label: 'อื่นๆ' },
  ],
  company_employee: [
    { value: 'animal_production', label: 'ผลิตสัตว์/ส่งออกหรือแปรรูปเนื้อสัตว์' },
    { value: 'animal_feed', label: 'ผลิตอาหารสัตว์' },
    { value: 'veterinary_distribution', label: 'จัดจำหน่ายเวชภัณฑ์สัตว์' },
    { value: 'elanco', label: 'พนักงานอีแลนโค (Elanco)' },
    { value: 'other', label: 'อื่นๆ' },
  ],
  veterinarian: [
    { value: 'livestock', label: 'สัตวแพทย์ประจำปศุสัตว์' },
  ],
};

interface RewardOverride {
  type: 'member_type' | 'tier';
  value: string;
  sub_type?: string;
  points: number;
}

export default function AdminMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [completionsDialogMission, setCompletionsDialogMission] = useState<Mission | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mission_type: 'qr_scan',
    points_reward: 0,
    coins_reward: 0,
    is_active: true,
    start_date: '',
    end_date: '',
    qr_code: '',
    location: '',
  });

  // Targeting State
  const [targetMemberTypes, setTargetMemberTypes] = useState<string[]>([]);
  const [targetSubTypes, setTargetSubTypes] = useState<Record<string, string[]>>({});
  const [targetTiers, setTargetTiers] = useState<string[]>([]);

  // Reward Overrides State
  const [rewardOverrides, setRewardOverrides] = useState<RewardOverride[]>([]);

  // Survey State
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);

  const { tiers: tierSettings } = useTierSettings();
  const dynamicTiers = (tierSettings || []).map(t => ({ value: t.tier, label: t.display_name || t.tier }));

  useEffect(() => {
    fetchMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const fetchMissions = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('mission_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch completion counts
      const { data: completions } = await supabase
        .from('mission_completions')
        .select('mission_id');

      const countMap: Record<string, number> = {};
      completions?.forEach(c => {
        countMap[c.mission_id] = (countMap[c.mission_id] || 0) + 1;
      });

      setMissions(((data || []) as Mission[]).map(m => ({
        ...m,
        completion_count: countMap[m.id] || 0,
      })));
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast.error('ไม่สามารถโหลดข้อมูลภารกิจได้');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      mission_type: 'qr_scan',
      points_reward: 0,
      coins_reward: 0,
      is_active: true,
      start_date: '',
      end_date: '',
      qr_code: '',
      location: '',
    });
    setTargetMemberTypes([]);
    setTargetSubTypes({});
    setTargetTiers([]);
    setRewardOverrides([]);
    setSurveyQuestions([]);
    setEditingMission(null);
  };

  const openEditDialog = async (mission: Mission) => {
    setEditingMission(mission);
    setFormData({
      title: mission.title,
      description: mission.description || '',
      mission_type: mission.mission_type,
      points_reward: mission.points_reward,
      coins_reward: mission.coins_reward,
      is_active: mission.is_active,
      start_date: mission.start_date ? mission.start_date.slice(0, 16) : '',
      end_date: mission.end_date ? mission.end_date.slice(0, 16) : '',
      qr_code: mission.qr_code || '',
      location: mission.location || '',
    });

    // Parse requirements
    if (mission.requirements) {
      setTargetMemberTypes(mission.requirements.targeting?.member_types || []);
      setTargetSubTypes(mission.requirements.targeting?.sub_types || {});
      setTargetTiers(mission.requirements.targeting?.tiers || []);
      setRewardOverrides((mission.requirements.reward_overrides || []) as RewardOverride[]);
    } else {
      setTargetMemberTypes([]);
      setTargetSubTypes({});
      setTargetTiers([]);
      setRewardOverrides([]);
    }

    // Load survey questions if survey type
    if (mission.mission_type === 'survey') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentId = (mission.requirements as any)?.content_id;
      if (contentId) {
        const { data } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('content_id', contentId)
          .order('order_index');

        if (data) {
          setSurveyQuestions(data.map(q => ({
            id: q.id,
            question: q.question,
            questionType: q.question_type as SurveyQuestion['questionType'],
            options: (q.options as string[]) || [],
            isRequired: q.is_required,
          })));
        } else {
          setSurveyQuestions([]);
        }
      } else {
        setSurveyQuestions([]);
      }
    } else {
      setSurveyQuestions([]);
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('กรุณากรอกชื่อภารกิจ');
      return;
    }

    // Validate survey questions
    if (formData.mission_type === 'survey') {
      if (surveyQuestions.length === 0) {
        toast.error('กรุณาเพิ่มคำถามแบบสำรวจอย่างน้อย 1 ข้อ');
        return;
      }
      for (const q of surveyQuestions) {
        if (!q.question.trim()) {
          toast.error('กรุณากรอกคำถามให้ครบ');
          return;
        }
        if ((q.questionType === 'single_choice' || q.questionType === 'multiple_choice') &&
          q.options.some(o => !o.trim())) {
          toast.error('กรุณากรอกตัวเลือกให้ครบ');
          return;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requirements: any = {
      targeting: {
        member_types: targetMemberTypes,
        sub_types: targetSubTypes,
        tiers: targetTiers
      },
      reward_overrides: rewardOverrides
    };

    try {
      // Handle survey content creation/update
      let surveyContentId: string | null = null;
      if (formData.mission_type === 'survey') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingContentId = editingMission?.requirements ? (editingMission.requirements as any).content_id : null;

        const contentData = {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          content_type: 'survey' as const,
          points_reward: formData.points_reward,
          is_published: formData.is_active,
          published_at: formData.is_active ? new Date().toISOString() : null,
          target_tiers: targetTiers.length > 0 ? targetTiers : null,
          target_member_types: targetMemberTypes.length > 0 ? targetMemberTypes : null,
          requirements: {
            targeting: {
              member_types: targetMemberTypes,
              sub_types: targetSubTypes,
              tiers: targetTiers
            },
            is_mission_survey: true
          }
        };

        if (existingContentId) {
          // Update existing content
          const { error: contentError } = await supabase
            .from('content')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(contentData as any)
            .eq('id', existingContentId);
          if (contentError) throw contentError;
          surveyContentId = existingContentId;

          // Delete old questions
          await supabase.from('survey_questions').delete().eq('content_id', existingContentId);
        } else {
          // Create new content
          const { data: newContent, error: contentError } = await supabase
            .from('content')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(contentData as any)
            .select('id')
            .single();
          if (contentError) throw contentError;
          surveyContentId = newContent.id;
        }

        // Insert survey questions
        if (surveyQuestions.length > 0 && surveyContentId) {
          const surveyData = surveyQuestions.map((q, index) => ({
            content_id: surveyContentId!,
            question: q.question,
            question_type: q.questionType,
            options: (q.questionType === 'single_choice' || q.questionType === 'multiple_choice') ? q.options : null,
            is_required: q.isRequired,
            order_index: index,
          }));

          const { error: surveyError } = await supabase
            .from('survey_questions')
            .insert(surveyData);
          if (surveyError) throw surveyError;
        }

        requirements.content_id = surveyContentId;
      }

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        mission_type: formData.mission_type,
        points_reward: formData.points_reward,
        coins_reward: formData.coins_reward,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        qr_code: formData.qr_code.trim() || null,
        location: formData.location.trim() || null,
        requirements: requirements
      };

      if (editingMission) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('missions') as any).update(payload).eq('id', editingMission.id);
        if (error) throw error;
        toast.success('อัปเดตภารกิจเรียบร้อย');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('missions') as any).insert([payload]);
        if (error) throw error;
        toast.success('สร้างภารกิจเรียบร้อย');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchMissions();
    } catch (error) {
      console.error('Error saving mission:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(`ไม่สามารถบันทึกภารกิจได้: ${msg}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบภารกิจนี้?')) return;
    try {
      // If survey mission, also delete linked content
      const mission = missions.find(m => m.id === id);
      if (mission?.mission_type === 'survey') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentId = (mission.requirements as any)?.content_id;
        if (contentId) {
          await supabase.from('survey_questions').delete().eq('content_id', contentId);
          await supabase.from('content').delete().eq('id', contentId);
        }
      }

      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบภารกิจเรียบร้อย');
      fetchMissions();
    } catch (error) {
      console.error('Error deleting mission:', error);
      toast.error('ไม่สามารถลบภารกิจได้');
    }
  };

  const toggleActive = async (mission: Mission) => {
    const { error } = await supabase.from('missions').update({ is_active: !mission.is_active }).eq('id', mission.id);
    if (error) {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    } else {
      fetchMissions();
    }
  };

  const getMissionTypeLabel = (type: string) => {
    return MISSION_TYPES.find(t => t.value === type)?.label || type;
  };

  const filteredMissions = missions.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper for Multi-select
  const toggleArrayItem = (item: string, currentItems: string[], setter: (items: string[]) => void) => {
    if (currentItems.includes(item)) {
      setter(currentItems.filter(i => i !== item));
    } else {
      setter([...currentItems, item]);
    }
  };

  const addRewardOverride = () => {
    setRewardOverrides([...rewardOverrides, { type: 'tier', value: 'gold', points: 0 }]);
  };

  const removeRewardOverride = (index: number) => {
    const newOverrides = [...rewardOverrides];
    newOverrides.splice(index, 1);
    setRewardOverrides(newOverrides);
  };

  const updateRewardOverride = (index: number, field: keyof RewardOverride, value: string | number | boolean) => {
    const newOverrides = [...rewardOverrides];
    newOverrides[index] = { ...newOverrides[index], [field]: value };
    // Reset sub_type when changing type or value
    if (field === 'type' || field === 'value') {
      delete newOverrides[index].sub_type;
    }
    setRewardOverrides(newOverrides);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการภารกิจพิเศษ</h1>
          <p className="text-muted-foreground">สร้างและจัดการภารกิจสแกน QR, เยี่ยมชมสถานที่, ทำแบบสำรวจ และภารกิจพิเศษ</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              สร้างภารกิจ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full">
            <DialogHeader>
              <DialogTitle>{editingMission ? 'แก้ไขภารกิจ' : 'สร้างภารกิจใหม่'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Basic Info */}
              <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> ข้อมูลทั่วไป</h3>
                <div className="space-y-2">
                  <Label>ชื่อภารกิจ *</Label>
                  <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="เช่น สแกน QR งาน Elanco Day" />
                </div>

                <div className="space-y-2">
                  <Label>รายละเอียด</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="อธิบายภารกิจ" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label>ประเภทภารกิจ</Label>
                  <Select value={formData.mission_type} onValueChange={v => setFormData(p => ({ ...p, mission_type: v }))}>
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
                      <Input value={formData.qr_code} onChange={e => setFormData(p => ({ ...p, qr_code: e.target.value }))} placeholder="รหัส QR Code" />
                    </div>
                  )}
                  {formData.mission_type === 'location_visit' && (
                    <div className="space-y-2">
                      <Label>สถานที่</Label>
                      <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="ชื่อหรือพิกัดสถานที่" />
                    </div>
                  )}
                </div>
              )}

              {/* Survey Editor */}
              {formData.mission_type === 'survey' && (
                <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                  <h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4" /> คำถามแบบสำรวจ</h3>
                  <SurveyEditor
                    questions={surveyQuestions}
                    onChange={setSurveyQuestions}
                  />
                </div>
              )}


              {/* Timing & Rewards */}
              <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                <h3 className="font-semibold flex items-center gap-2"><GripVertical className="w-4 h-4" /> ระยะเวลาและรางวัลพื้นฐาน</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>คะแนนที่ได้รับ</Label>
                    <Input type="number" min="0" value={formData.points_reward} onChange={e => setFormData(p => ({ ...p, points_reward: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>เหรียญที่ได้รับ</Label>
                    <Input type="number" min="0" value={formData.coins_reward} onChange={e => setFormData(p => ({ ...p, coins_reward: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันเริ่มต้น</Label>
                    <Input type="datetime-local" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>วันสิ้นสุด</Label>
                    <Input type="datetime-local" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
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
                                toggleArrayItem(type.value, targetMemberTypes, setTargetMemberTypes);
                                // Clear sub-types when unchecking
                                if (isChecked) {
                                  setTargetSubTypes(prev => {
                                    const next = { ...prev };
                                    delete next[type.value];
                                    return next;
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`member-${type.value}`} className="text-sm font-medium leading-none cursor-pointer">
                              {type.label}
                            </label>
                            {subTypes && <span className="text-xs text-muted-foreground ml-auto">({subTypes.length} ประเภทย่อย)</span>}
                          </div>
                          {/* Sub-types: show when parent is checked */}
                          {isChecked && subTypes && (
                            <div className="ml-6 mt-1 mb-2 pl-3 border-l-2 border-primary/30 space-y-1">
                              <p className="text-xs text-muted-foreground mb-1">เลือกประเภทย่อย (ว่าง = ทุกประเภทย่อย)</p>
                              {subTypes.map(sub => (
                                <div key={sub.value} className="flex items-center space-x-2 p-1.5 rounded bg-background/50">
                                  <Checkbox
                                    id={`sub-${type.value}-${sub.value}`}
                                    checked={(targetSubTypes[type.value] || []).includes(sub.value)}
                                    onCheckedChange={() => {
                                      setTargetSubTypes(prev => {
                                        const current = prev[type.value] || [];
                                        const updated = current.includes(sub.value)
                                          ? current.filter(v => v !== sub.value)
                                          : [...current, sub.value];
                                        return { ...prev, [type.value]: updated };
                                      });
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
                          onCheckedChange={() => toggleArrayItem(tier.value, targetTiers, setTargetTiers)}
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
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member_type">ประเภทสมาชิก</SelectItem>
                                <SelectItem value="tier">ระดับ (Tier)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">ค่า</Label>
                            <Select value={override.value} onValueChange={(v) => updateRewardOverride(index, 'value', v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
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
                        {/* Sub-type dropdown: show when member_type is selected and has sub-types */}
                        {overrideSubTypes && overrideSubTypes.length > 0 && (
                          <div className="ml-4 pl-3 border-l-2 border-primary/30">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">ประเภทย่อย (ว่าง = ทุกประเภทย่อย)</Label>
                              <Select value={override.sub_type || '__all__'} onValueChange={(v) => updateRewardOverride(index, 'sub_type', v === '__all__' ? undefined : v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
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
                <Switch checked={formData.is_active} onCheckedChange={c => setFormData(p => ({ ...p, is_active: c }))} />
                <Label>เปิดใช้งานทันที</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>ยกเลิก</Button>
                <Button type="submit">{editingMission ? 'บันทึกการแก้ไข' : 'สร้างภารกิจ'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="ค้นหาภารกิจ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="ประเภท" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {MISSION_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            รายการภารกิจ ({filteredMissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
          ) : filteredMissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">ยังไม่มีภารกิจ</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">ชื่อภารกิจ</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>รางวัล</TableHead>
                    <TableHead>ระยะเวลา</TableHead>
                    <TableHead className="text-center">ทำสำเร็จ</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMissions.map(mission => (
                    <TableRow key={mission.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{mission.title}</p>
                          {mission.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{mission.description}</p>
                          )}
                          {mission.requirements?.targeting?.member_types && mission.requirements.targeting.member_types.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2 w-full">
                              {mission.requirements.targeting.member_types.map((type: string) => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const parsedReqs = mission.requirements as any;
                                const subTypes = parsedReqs?.targeting?.sub_types?.[type] || [];

                                return (
                                  <div key={type} className="border border-border/50 rounded p-1.5 bg-background">
                                    <div className="text-[11px] font-medium text-foreground leading-none">
                                      {MEMBER_TYPES.find(t => t.value === type)?.label || type}
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
                          )}
                          {/* Tiers */}
                          {mission.requirements?.targeting?.tiers && mission.requirements.targeting.tiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {mission.requirements.targeting.tiers.map((tier: string) => {
                                const matchedTier = tierSettings?.find(t => t.tier === tier);
                                const displayName = matchedTier?.display_name || tier;
                                const customColor = matchedTier?.color;
                                const badgeClass = customColor ? '' : (tier === 'platinum' ? 'bg-purple-600 text-white' : tier === 'gold' ? 'bg-yellow-500 text-white' : tier === 'silver' ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white');

                                return (
                                  <Badge
                                    key={tier}
                                    className={`text-[9px] px-1 py-0 h-4 capitalize border-0 ${badgeClass}`}
                                    style={customColor ? { backgroundColor: customColor, color: '#fff' } : undefined}
                                  >
                                    {displayName}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          mission.mission_type === 'qr_scan' ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' :
                            mission.mission_type === 'location_visit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                              mission.mission_type === 'survey' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                mission.mission_type === 'special' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : ''
                        }>
                          {getMissionTypeLabel(mission.mission_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {mission.points_reward > 0 && (
                            <span className="text-xs">⭐ {mission.points_reward} คะแนน</span>
                          )}
                          {mission.coins_reward > 0 && (
                            <span className="text-xs">🪙 {mission.coins_reward} เหรียญ</span>
                          )}
                          {mission.requirements?.reward_overrides && mission.requirements.reward_overrides.length > 0 && (
                            <span className="text-[10px] text-amber-600">+ เพิ่มเติมตามเงื่อนไข</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {mission.start_date && (
                            <p>{format(new Date(mission.start_date), 'd MMM yy', { locale: th })}</p>
                          )}
                          {mission.end_date && (
                            <p className="text-muted-foreground">ถึง {format(new Date(mission.end_date), 'd MMM yy', { locale: th })}</p>
                          )}
                          {!mission.start_date && !mission.end_date && (
                            <span className="text-muted-foreground">ไม่จำกัด</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setCompletionsDialogMission(mission)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {mission.completion_count || 0}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Switch checked={mission.is_active} onCheckedChange={() => toggleActive(mission)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(mission)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(mission.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completions Dialog */}
      {completionsDialogMission && (
        <MissionCompletionsDialog
          mission={completionsDialogMission}
          open={!!completionsDialogMission}
          onOpenChange={(open) => { if (!open) setCompletionsDialogMission(null); }}
        />
      )}
    </div>
  );
}
