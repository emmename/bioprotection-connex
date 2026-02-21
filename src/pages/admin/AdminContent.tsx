import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Search, Plus, Edit, Trash2, FileText, Video, HelpCircle, ClipboardList, Eye, Users } from 'lucide-react';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { QuizEditor, QuizQuestion } from '@/components/admin/QuizEditor';
import { SurveyEditor, SurveyQuestion } from '@/components/admin/SurveyEditor';
import { ContentPreview } from '@/components/admin/ContentPreview';
import { ThumbnailUploader } from '@/components/admin/ThumbnailUploader';
import { useTierSettings } from '@/hooks/useGamification';

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
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
    reward_overrides?: Array<{ type: string; value: string; sub_type?: string; points: number; coins: number }>;
    [key: string]: unknown;
  } | null;
}

type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';
type MemberType = 'farm' | 'company_employee' | 'veterinarian' | 'livestock_shop';

const MEMBER_TYPE_OPTIONS: { value: MemberType; label: string }[] = [
  { value: 'farm', label: 'ฟาร์มเลี้ยงสัตว์' },
  { value: 'company_employee', label: 'พนักงานบริษัท' },
  { value: 'veterinarian', label: 'สัตวแพทย์' },
  { value: 'livestock_shop', label: 'ร้านขายสินค้าปศุสัตว์' },
];

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

const contentTypeLabels: Record<string, { label: string; icon: typeof FileText }> = {
  article: { label: 'บทความ', icon: FileText },
  video: { label: 'วิดีโอ', icon: Video },
  quiz: { label: 'แบบทดสอบ', icon: HelpCircle },
  survey: { label: 'แบบสำรวจ', icon: ClipboardList },
};

export default function AdminContent() {
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    content_type: 'article' | 'video' | 'quiz' | 'survey';
    content_body: string;
    video_url: string;
    thumbnail_url: string;
    points_reward: number;
    is_published: boolean;
    target_tiers: TierLevel[];
    target_member_types: MemberType[];
  }>({
    title: '',
    description: '',
    content_type: 'article',
    content_body: '',
    video_url: '',
    thumbnail_url: '',
    points_reward: 10,
    is_published: false,
    target_tiers: [],
    target_member_types: [],
  });
  const [targetSubTypes, setTargetSubTypes] = useState<Record<string, string[]>>({});
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditPointsOpen, setIsBulkEditPointsOpen] = useState(false);
  const [isBulkEditTiersOpen, setIsBulkEditTiersOpen] = useState(false);
  const [bulkPointsValue, setBulkPointsValue] = useState<number>(10);
  const [bulkTiersValue, setBulkTiersValue] = useState<TierLevel[]>([]);

  const { tiers: tierSettings } = useTierSettings();
  const dynamicTiers = (tierSettings || []).map(t => ({ value: t.tier as TierLevel, label: t.display_name || t.tier }));

  useEffect(() => {
    fetchContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('content_type', typeFilter as 'article' | 'video' | 'quiz' | 'survey');
      }

      const { data, error } = await query;

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('ไม่สามารถโหลดข้อมูลเนื้อหาได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('กรุณากรอกชื่อเนื้อหา');
      return;
    }

    // Validate quiz questions
    if (formData.content_type === 'quiz') {
      if (quizQuestions.length === 0) {
        toast.error('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
        return;
      }
      for (const q of quizQuestions) {
        if (!q.question.trim()) {
          toast.error('กรุณากรอกคำถามให้ครบ');
          return;
        }
        if (q.options.some(o => !o.trim())) {
          toast.error('กรุณากรอกตัวเลือกให้ครบ');
          return;
        }
      }
    }

    // Validate survey questions
    if (formData.content_type === 'survey') {
      if (surveyQuestions.length === 0) {
        toast.error('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ');
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

    setIsSaving(true);
    try {
      const contentData = {
        title: formData.title,
        description: formData.description || null,
        content_type: formData.content_type,
        content_body: formData.content_body || null,
        video_url: formData.video_url || null,
        thumbnail_url: formData.thumbnail_url || null,
        points_reward: formData.points_reward,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        target_tiers: formData.target_tiers.length > 0 ? formData.target_tiers : null,
        target_member_types: formData.target_member_types.length > 0 ? formData.target_member_types : null,
        requirements: {
          targeting: {
            member_types: formData.target_member_types,
            sub_types: targetSubTypes,
            tiers: formData.target_tiers
          }
        }
      };

      let contentId: string;

      if (editingContent) {
        const { error } = await supabase
          .from('content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        contentId = editingContent.id;

        // Delete existing questions if quiz/survey
        if (formData.content_type === 'quiz') {
          await supabase.from('quiz_questions').delete().eq('content_id', contentId);
        } else if (formData.content_type === 'survey') {
          await supabase.from('survey_questions').delete().eq('content_id', contentId);
        }
      } else {
        const { data, error } = await supabase
          .from('content')
          .insert(contentData)
          .select('id')
          .single();

        if (error) throw error;
        contentId = data.id;
      }

      // Insert quiz questions
      if (formData.content_type === 'quiz' && quizQuestions.length > 0) {
        const quizData = quizQuestions.map((q, index) => ({
          content_id: contentId,
          question: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          points: q.points,
          order_index: index,
        }));

        const { error: quizError } = await supabase
          .from('quiz_questions')
          .insert(quizData);

        if (quizError) throw quizError;
      }

      // Insert survey questions
      if (formData.content_type === 'survey' && surveyQuestions.length > 0) {
        const surveyData = surveyQuestions.map((q, index) => ({
          content_id: contentId,
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

      toast.success(editingContent ? 'อัพเดทเนื้อหาสำเร็จ' : 'สร้างเนื้อหาสำเร็จ');
      setIsDialogOpen(false);
      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('ไม่สามารถบันทึกเนื้อหาได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบเนื้อหานี้หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('ลบเนื้อหาสำเร็จ');
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('ไม่สามารถลบเนื้อหาได้');
    }
  };

  const togglePublish = async (content: Content) => {
    try {
      const { error } = await supabase
        .from('content')
        .update({
          is_published: !content.is_published,
          published_at: !content.is_published ? new Date().toISOString() : null,
        })
        .eq('id', content.id);

      if (error) throw error;
      toast.success(content.is_published ? 'ยกเลิกการเผยแพร่แล้ว' : 'เผยแพร่แล้ว');
      fetchContents();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'article',
      content_body: '',
      video_url: '',
      thumbnail_url: '',
      points_reward: 10,
      is_published: false,
      target_tiers: [],
      target_member_types: [],
    });
    setTargetSubTypes({});
    setQuizQuestions([]);
    setSurveyQuestions([]);
    setEditingContent(null);
  };

  const openEditDialog = async (content: Content) => {
    setEditingContent(content);

    // Load content details including thumbnail
    const { data: contentDetails } = await supabase
      .from('content')
      .select('content_body, video_url, thumbnail_url, requirements')
      .eq('id', content.id)
      .single() as { data: { content_body: string | null; video_url: string | null; thumbnail_url: string | null; requirements: Content['requirements'] } | null; error: unknown };

    setFormData({
      title: content.title,
      description: content.description || '',
      content_type: content.content_type as 'article' | 'video' | 'quiz' | 'survey',
      content_body: contentDetails?.content_body || '',
      video_url: contentDetails?.video_url || '',
      thumbnail_url: contentDetails?.thumbnail_url || '',
      points_reward: content.points_reward,
      is_published: content.is_published,
      target_tiers: (content.target_tiers || []) as TierLevel[],
      target_member_types: (content.target_member_types || []) as MemberType[],
    });

    if (contentDetails?.requirements?.targeting?.sub_types) {
      setTargetSubTypes(contentDetails.requirements.targeting.sub_types);
    } else {
      setTargetSubTypes({});
    }

    // Load existing questions for quiz/survey
    if (content.content_type === 'quiz') {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('content_id', content.id)
        .order('order_index');

      if (data) {
        setQuizQuestions(data.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correctAnswer: q.correct_answer,
          points: q.points,
        })));
      }
    } else if (content.content_type === 'survey') {
      const { data } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('content_id', content.id)
        .order('order_index');

      if (data) {
        setSurveyQuestions(data.map(q => ({
          id: q.id,
          question: q.question,
          questionType: q.question_type as 'single_choice' | 'multiple_choice' | 'rating' | 'text',
          options: (q.options as string[]) || [],
          isRequired: q.is_required,
        })));
      }
    } else {
      setQuizQuestions([]);
      setSurveyQuestions([]);
    }

    setIsDialogOpen(true);
  };

  const handleQuickUpdate = async (id: string, updates: Partial<Content>) => {
    try {
      const { error } = await supabase
        .from('content')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      setContents(prev => prev.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ));

      toast.success('อัพเดทข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('ไม่สามารถอัพเดทข้อมูลได้');
    }
  };

  const InlinePointsEdit = ({ content }: { content: Content }) => {
    const [value, setValue] = useState(content.points_reward.toString());
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmit = () => {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue !== content.points_reward) {
        handleQuickUpdate(content.id, { points_reward: numValue });
      } else {
        setValue(content.points_reward.toString()); // Reset on invalid or same
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
  };

  const InlineTiersEdit = ({ content }: { content: Content }) => {
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

                        // If updated to include all options, strict validation might treat it as "specific tiers".
                        // Logic for "all tiers" usually means empty array in DB for this system.
                        // However, let's keep it explicit based on user selection.

                        handleQuickUpdate(content.id, {
                          target_tiers: newTiers.length > 0 ? newTiers : null
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any);
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
  };

  const openPreviewDialog = async (content: Content) => {
    // Load content details including thumbnail
    const { data: contentDetails } = await supabase
      .from('content')
      .select('content_body, video_url, thumbnail_url')
      .eq('id', content.id)
      .single();

    setFormData({
      title: content.title,
      description: content.description || '',
      content_type: content.content_type as 'article' | 'video' | 'quiz' | 'survey',
      content_body: contentDetails?.content_body || '',
      video_url: contentDetails?.video_url || '',
      thumbnail_url: contentDetails?.thumbnail_url || '',
      points_reward: content.points_reward,
      is_published: content.is_published,
      target_tiers: (content.target_tiers || []) as TierLevel[],
      target_member_types: (content.target_member_types || []) as MemberType[],
    });

    // Load quiz questions
    if (content.content_type === 'quiz') {
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('content_id', content.id)
        .order('order_index');

      if (data) {
        setQuizQuestions(data.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correctAnswer: q.correct_answer,
          points: q.points,
        })));
      } else {
        setQuizQuestions([]);
      }
    } else if (content.content_type === 'survey') {
      const { data } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('content_id', content.id)
        .order('order_index');

      if (data) {
        setSurveyQuestions(data.map(q => ({
          id: q.id,
          question: q.question,
          questionType: q.question_type as 'single_choice' | 'multiple_choice' | 'rating' | 'text' | 'likert' | 'ranking' | 'matrix' | 'slider',
          options: (q.options as string[]) || [],
          isRequired: q.is_required,
        })));
      } else {
        setSurveyQuestions([]);
      }
    } else {
      setQuizQuestions([]);
      setSurveyQuestions([]);
    }

    setIsPreviewOpen(true);
  };

  const filteredContents = contents.filter(content => {
    const searchLower = searchQuery.toLowerCase();
    return content.title.toLowerCase().includes(searchLower);
  });

  const toggleArrayItem = (item: string, currentItems: string[], setter: (items: string[]) => void) => {
    if (currentItems.includes(item)) {
      setter(currentItems.filter(i => i !== item));
    } else {
      setter([...currentItems, item]);
    }
  };



  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredContents.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`คุณต้องการลบเนื้อหาที่เลือก ${selectedIds.length} รายการหรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`ลบเนื้อหา ${selectedIds.length} รายการสำเร็จ`);
      setSelectedIds([]);
      fetchContents();
    } catch (error) {
      console.error('Error deleting contents:', error);
      toast.error('ไม่สามารถลบเนื้อหาได้');
    }
  };

  const handleBulkPublish = async (isPublished: boolean) => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('content')
        .update({
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`${isPublished ? 'เผยแพร่' : 'ยกเลิกการเผยแพร่'}เนื้อหา ${selectedIds.length} รายการสำเร็จ`);
      setSelectedIds([]);
      fetchContents();
    } catch (error) {
      console.error('Error updating publish status:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleBulkEditPoints = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('content')
        .update({ points_reward: bulkPointsValue })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`อัปเดตคะแนน ${selectedIds.length} รายการสำเร็จ`);
      setIsBulkEditPointsOpen(false);
      setSelectedIds([]);
      fetchContents();
    } catch (error) {
      console.error('Error updating points:', error);
      toast.error('ไม่สามารถอัปเดตคะแนนได้');
    }
  };

  const handleBulkEditTiers = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('content')
        .update({ target_tiers: bulkTiersValue.length > 0 ? bulkTiersValue : null }) // null means all tiers
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`อัปเดต Tier ${selectedIds.length} รายการสำเร็จ`);
      setIsBulkEditTiersOpen(false);
      setSelectedIds([]);
      fetchContents();
    } catch (error) {
      console.error('Error updating tiers:', error);
      toast.error('ไม่สามารถอัปเดต Tier ได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการเนื้อหา</h1>
          <p className="text-muted-foreground">สร้างและจัดการบทความ, วิดีโอ, แบบทดสอบ และแบบสำรวจ</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              สร้างเนื้อหา
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? 'แก้ไขเนื้อหา' : 'สร้างเนื้อหาใหม่'}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
              <div className="space-y-6 p-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ประเภทเนื้อหา</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(value: 'article' | 'video' | 'quiz' | 'survey') => {
                        setFormData(prev => ({ ...prev, content_type: value }));
                        setQuizQuestions([]);
                        setSurveyQuestions([]);
                      }}
                      disabled={!!editingContent}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">บทความ</SelectItem>
                        <SelectItem value="video">วิดีโอ</SelectItem>
                        <SelectItem value="quiz">แบบทดสอบ</SelectItem>
                        <SelectItem value="survey">แบบสำรวจ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>คะแนนที่ได้รับ</Label>
                    <Input
                      type="number"
                      value={formData.points_reward}
                      onChange={(e) => setFormData(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>



                <div className="space-y-2">
                  <Label>ชื่อเนื้อหา *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="ระบุชื่อเนื้อหา"
                  />
                </div>

                <div className="space-y-2">
                  <Label>คำอธิบาย</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="คำอธิบายสั้นๆ"
                  />
                </div>

                <div className="space-y-2">
                  <Label>รูปปก (Thumbnail)</Label>
                  <ThumbnailUploader
                    value={formData.thumbnail_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))}
                    bucket="content-thumbnails"
                  />
                </div>

                {formData.content_type === 'article' && (
                  <ArticleEditor
                    value={formData.content_body}
                    onChange={(value) => setFormData(prev => ({ ...prev, content_body: value }))}
                  />
                )}

                {formData.content_type === 'video' && (
                  <div className="space-y-2">
                    <Label>URL วิดีโอ</Label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                )}

                {formData.content_type === 'quiz' && (
                  <QuizEditor
                    questions={quizQuestions}
                    onChange={setQuizQuestions}
                  />
                )}

                {formData.content_type === 'survey' && (
                  <SurveyEditor
                    questions={surveyQuestions}
                    onChange={setSurveyQuestions}
                  />
                )}

                {/* Targeting */}
                <div className="space-y-4 border p-4 rounded-lg bg-secondary/10 mt-6">
                  <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> สิทธิ์การเข้าถึง (ว่าง = ทุกคน)</h3>

                  <div className="space-y-3">
                    <Label className="text-base">ประเภทสมาชิก</Label>
                    <div className="space-y-2">
                      {MEMBER_TYPE_OPTIONS.map(type => {
                        const subTypes = MEMBER_SUB_TYPES[type.value];
                        const isChecked = formData.target_member_types.includes(type.value);

                        return (
                          <div key={type.value}>
                            <div className="flex items-center space-x-2 border p-2 rounded bg-background">
                              <Checkbox
                                id={`member-${type.value}`}
                                checked={isChecked}
                                onCheckedChange={() => {
                                  let newTypes: string[];
                                  if (isChecked) {
                                    newTypes = formData.target_member_types.filter(t => t !== type.value);
                                    // Clear sub-types
                                    setTargetSubTypes(prev => {
                                      const next = { ...prev };
                                      delete next[type.value];
                                      return next;
                                    });
                                  } else {
                                    newTypes = [...formData.target_member_types, type.value];
                                  }
                                  setFormData(prev => ({ ...prev, target_member_types: newTypes as MemberType[] }));
                                }}
                              />
                              <label htmlFor={`member-${type.value}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                                {type.label}
                              </label>
                              {subTypes && <span className="text-xs text-muted-foreground mr-2">({subTypes.length} ประเภทย่อย)</span>}
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

                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-base">ระดับสมาชิก (Tier)</Label>
                    <div className="flex flex-wrap gap-2">
                      {dynamicTiers.map(tier => (
                        <div key={tier.value} className="flex items-center space-x-2 border p-2 rounded bg-background">
                          <Checkbox
                            id={`tier-${tier.value}`}
                            checked={formData.target_tiers.includes(tier.value)}
                            onCheckedChange={() => {
                              toggleArrayItem(
                                tier.value,
                                formData.target_tiers,
                                (items) => setFormData(prev => ({ ...prev, target_tiers: items as TierLevel[] }))
                              );
                            }}
                          />
                          <label htmlFor={`tier-${tier.value}`} className="text-sm font-medium leading-none cursor-pointer capitalize">
                            {tier.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                  />
                  <Label>เผยแพร่ทันที</Label>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                ดูตัวอย่าง
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเนื้อหา"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="ประเภทเนื้อหา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="article">บทความ</SelectItem>
                <SelectItem value="video">วิดีโอ</SelectItem>
                <SelectItem value="quiz">แบบทดสอบ</SelectItem>
                <SelectItem value="survey">แบบสำรวจ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={filteredContents.length > 0 && selectedIds.length === filteredContents.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
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
                ) : filteredContents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบเนื้อหา
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContents.map((content) => {
                    const TypeIcon = contentTypeLabels[content.content_type]?.icon || FileText;
                    return (
                      <TableRow key={content.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(content.id)}
                            onCheckedChange={(checked) => handleSelect(content.id, !!checked)}
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
                          <Badge variant="outline" className={
                            content.content_type === 'article' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                              content.content_type === 'video' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                content.content_type === 'quiz' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                  content.content_type === 'survey' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' : ''
                          }>
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
                                  const parsedReqs = content.requirements as any;
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
                          <InlinePointsEdit content={content} />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={content.is_published}
                            onCheckedChange={() => togglePublish(content)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(content.created_at).toLocaleDateString('th-TH')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPreviewDialog(content)}
                              title="ดูตัวอย่าง"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(content)}
                              title="แก้ไข"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(content.id)}
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

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="text-sm font-medium whitespace-nowrap">
            เลือก {selectedIds.length} รายการ
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBulkEditPointsOpen(true)}
              className="text-xs"
            >
              แก้ไขคะแนน
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBulkEditTiersOpen(true)}
              className="text-xs"
            >
              แก้ไข Tier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkPublish(true)}
              className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              เผยแพร่
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkPublish(false)}
              className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              ยกเลิกเผยแพร่
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
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
            onClick={() => setSelectedIds([])}
          >
            <span className="sr-only">Close</span>
            x
          </Button>
        </div>
      )}

      {/* Bulk Edit Points Dialog */}
      <Dialog open={isBulkEditPointsOpen} onOpenChange={setIsBulkEditPointsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>แก้ไขคะแนน {selectedIds.length} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>คะแนนใหม่</Label>
              <Input
                type="number"
                value={bulkPointsValue}
                onChange={(e) => setBulkPointsValue(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                เนื้อหาที่เลือกทั้งหมดจะถูกตั้งค่าคะแนนเป็นจำนวนนี้
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditPointsOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleBulkEditPoints}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Tiers Dialog */}
      <Dialog open={isBulkEditTiersOpen} onOpenChange={setIsBulkEditTiersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไข Tier {selectedIds.length} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>สิทธิ์การเข้าถึงตาม Tier (เลือกใหม่เพื่อเขียนทับ)</Label>
              <div className="flex flex-wrap gap-4">
                {dynamicTiers.map((tier) => (
                  <div key={tier.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-tier-${tier.value}`}
                      checked={bulkTiersValue.includes(tier.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkTiersValue(prev => [...prev, tier.value]);
                        } else {
                          setBulkTiersValue(prev => prev.filter(t => t !== tier.value));
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
            <Button variant="outline" onClick={() => setIsBulkEditTiersOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleBulkEditTiers}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Standalone Preview Modal for table preview */}
      <ContentPreview
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        title={formData.title}
        description={formData.description}
        contentType={formData.content_type}
        contentBody={formData.content_body}
        videoUrl={formData.video_url}
        pointsReward={formData.points_reward}
        quizQuestions={quizQuestions}
        surveyQuestions={surveyQuestions}
      />
    </div>
  );
}
