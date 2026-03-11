import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, QrCode, MapPin, Target, ClipboardList } from 'lucide-react';
import { MissionCompletionsDialog } from '@/components/admin/MissionCompletionsDialog';
import { useTierSettings } from '@/hooks/useGamification';
import { SurveyQuestion } from '@/components/admin/SurveyEditor';
import { MissionFormDialog, type MissionFormData, type RewardOverride } from '@/components/admin/MissionFormDialog';
import { MissionTable, type Mission } from '@/components/admin/MissionTable';

const MISSION_TYPES = [
  { value: 'qr_scan', label: 'สแกน QR Code', icon: QrCode },
  { value: 'location_visit', label: 'Check-in', icon: MapPin },
  { value: 'survey', label: 'ทำแบบสำรวจ', icon: ClipboardList },
  { value: 'special', label: 'ภารกิจพิเศษ', icon: Target },
];

export default function AdminMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [completionsDialogMission, setCompletionsDialogMission] = useState<Mission | null>(null);
  const [formData, setFormData] = useState<MissionFormData>({
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

      const missionsArray = (data || []) as Mission[];

      // Fetch completion counts
      const { data: completions } = await supabase
        .from('mission_completions')
        .select('mission_id');

      const countMap: Record<string, number> = {};
      completions?.forEach(c => {
        countMap[c.mission_id] = (countMap[c.mission_id] || 0) + 1;
      });

      // Fetch content completions for survey missions
      const surveyMissions = missionsArray.filter(m => m.mission_type === 'survey');
      if (surveyMissions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentIds = surveyMissions.map(m => (m.requirements as Record<string, any>)?.content_id).filter(Boolean);
        if (contentIds.length > 0) {
          const { data: contentCompletions } = await supabase
            .from('content_progress')
            .select('content_id')
            .eq('is_completed', true)
            .in('content_id', contentIds);

          const contentCountMap: Record<string, number> = {};
          contentCompletions?.forEach(c => {
            contentCountMap[c.content_id] = (contentCountMap[c.content_id] || 0) + 1;
          });

          surveyMissions.forEach(m => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cId = (m.requirements as Record<string, any>)?.content_id;
            if (cId) {
              countMap[m.id] = (countMap[m.id] || 0) + (contentCountMap[cId] || 0);
            }
          });
        }
      }

      setMissions(missionsArray.map(m => ({
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
      const contentId = (mission.requirements as Record<string, any>)?.content_id;
      if (contentId) {
        const { data } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('content_id', contentId)
          .order('order_index');

        if (data) {
          setSurveyQuestions(data.map(q => {
            let parsedOpts: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let extraFields: any = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const opts = q.options as Record<string, any>;
            if (opts) {
              if (Array.isArray(opts)) {
                parsedOpts = opts;
              } else {
                if (opts.choices) parsedOpts = opts.choices;
                if (opts.allowAdditionalText !== undefined) extraFields.allowAdditionalText = opts.allowAdditionalText;
                if (opts.additionalTextPlaceholder !== undefined) extraFields.additionalTextPlaceholder = opts.additionalTextPlaceholder;
                if (opts.allowMultipleImages !== undefined) extraFields.allowMultipleImages = opts.allowMultipleImages;
                if (opts.maxImages !== undefined) extraFields.maxImages = opts.maxImages;
                if (opts.max) extraFields.maxRating = opts.max;
                if (opts.min !== undefined) {
                  extraFields.sliderMin = opts.min;
                  extraFields.sliderMax = opts.max;
                  extraFields.sliderStep = opts.step;
                  extraFields.sliderMinLabel = opts.minLabel;
                  extraFields.sliderMaxLabel = opts.maxLabel;
                }
                if (opts.rows) {
                  extraFields.matrixRows = opts.rows;
                  extraFields.matrixColumns = opts.columns;
                }
                if (opts.items) parsedOpts = opts.items;
                if (opts.labels) {
                  extraFields.likertScale = opts.labels.length;
                  extraFields.likertLabels = { left: opts.labels[0] || '', right: opts.labels[opts.labels.length - 1] || '' };
                }
                if (opts.screeningCorrectAnswer !== undefined && opts.choices) {
                  extraFields.isScreening = true;
                  extraFields.screeningLogic = { option: opts.choices[opts.screeningCorrectAnswer], action: 'terminate' };
                }
              }
            }
            return {
              id: q.id,
              question: q.question,
              questionType: q.question_type as SurveyQuestion['questionType'],
              options: parsedOpts,
              isRequired: q.is_required,
              ...extraFields
            };
          }));
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
        const existingContentId = editingMission?.requirements ? (editingMission.requirements as Record<string, any>).content_id : null;

        const contentData = {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          content_type: 'survey' as const,
          points_reward: formData.points_reward,
          is_published: formData.is_active,
          published_at: formData.is_active ? new Date().toISOString() : null,
          target_tiers: targetTiers.length > 0 ? (targetTiers as Database['public']['Enums']['tier_level'][]) : null,
          target_member_types: targetMemberTypes.length > 0 ? (targetMemberTypes as Database['public']['Enums']['member_type'][]) : null,
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
          const { error: contentError } = await supabase
            .from('content')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(contentData)
            .eq('id', existingContentId);
          if (contentError) throw contentError;
          surveyContentId = existingContentId;

          await supabase.from('survey_questions').delete().eq('content_id', existingContentId);
        } else {
          const { data: newContent, error: contentError } = await supabase
            .from('content')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert(contentData)
            .select('id')
            .single();
          if (contentError) throw contentError;
          surveyContentId = newContent.id;
        }

        // Insert survey questions
        if (surveyQuestions.length > 0 && surveyContentId) {
          const surveyData = surveyQuestions.map((q, index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let optionsJson: any = null;

            switch (q.questionType) {
              case 'single_choice':
              case 'multiple_choice':
                optionsJson = { 
                  choices: q.options,
                  allowAdditionalText: q.allowAdditionalText,
                  additionalTextPlaceholder: q.additionalTextPlaceholder
                };
                if (q.isScreening && q.questionType === 'single_choice') {
                  optionsJson.screeningCorrectAnswer = q.options.indexOf(q.screeningLogic?.option || '');
                }
                break;
              case 'image_upload':
                optionsJson = {
                  allowMultipleImages: q.allowMultipleImages,
                  maxImages: q.maxImages
                };
                break;
              case 'rating':
                optionsJson = { max: q.maxRating || 5 };
                break;
              case 'slider':
                optionsJson = {
                  min: q.sliderMin || 0,
                  max: q.sliderMax || 100,
                  step: q.sliderStep || 1,
                  minLabel: q.sliderMinLabel || '',
                  maxLabel: q.sliderMaxLabel || '',
                };
                break;
              case 'matrix':
                optionsJson = {
                  rows: (q.matrixRows || []).filter(Boolean),
                  columns: (q.matrixColumns || []).filter(Boolean),
                };
                break;
              case 'ranking':
                optionsJson = { items: q.options.filter(Boolean) };
                break;
              case 'likert': {
                const scale = q.likertScale || 5;
                const labels = Array(scale).fill('');
                labels[0] = q.likertLabels?.left || '';
                labels[scale - 1] = q.likertLabels?.right || '';
                optionsJson = { labels };
                break;
              }
              case 'text':
              default:
                optionsJson = null;
                break;
            }

            return {
              content_id: surveyContentId!,
              question: q.question,
              question_type: q.questionType,
              options: optionsJson,
              is_required: q.isRequired,
              order_index: index,
            };
          });

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
        const { error } = await supabase.from('missions').update(payload).eq('id', editingMission.id);
        if (error) throw error;
        toast.success('อัปเดตภารกิจเรียบร้อย');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('missions').insert([payload]);
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
      const mission = missions.find(m => m.id === id);
      if (mission?.mission_type === 'survey') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentId = (mission.requirements as Record<string, any>)?.content_id;
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
    const newStatus = !mission.is_active;
    const { error } = await supabase.from('missions').update({ is_active: newStatus }).eq('id', mission.id);

    if (!error && mission.mission_type === 'survey') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentId = (mission.requirements as Record<string, any>)?.content_id;
      if (contentId) {
        await supabase.from('content').update({
          is_published: newStatus,
          published_at: newStatus ? new Date().toISOString() : null
        }).eq('id', contentId);
      }
    }

    if (error) {
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    } else {
      fetchMissions();
    }
  };

  const filteredMissions = missions.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการภารกิจพิเศษ</h1>
          <p className="text-muted-foreground">สร้างและจัดการภารกิจสแกน QR, Check-in, ทำแบบสำรวจ และภารกิจพิเศษ</p>
        </div>
        <MissionFormDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isEditing={!!editingMission}
          formData={formData}
          onFormDataChange={setFormData}
          onSubmit={handleSubmit}
          onReset={resetForm}
          targetMemberTypes={targetMemberTypes}
          onTargetMemberTypesChange={setTargetMemberTypes}
          targetSubTypes={targetSubTypes}
          onTargetSubTypesChange={setTargetSubTypes}
          targetTiers={targetTiers}
          onTargetTiersChange={setTargetTiers}
          dynamicTiers={dynamicTiers}
          rewardOverrides={rewardOverrides}
          onRewardOverridesChange={setRewardOverrides}
          surveyQuestions={surveyQuestions}
          onSurveyQuestionsChange={setSurveyQuestions}
        />
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
      <MissionTable
        missions={filteredMissions}
        isLoading={isLoading}
        tierSettings={tierSettings}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onToggleActive={toggleActive}
        onViewCompletions={setCompletionsDialogMission}
      />

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
