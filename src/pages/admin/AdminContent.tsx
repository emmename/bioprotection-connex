import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Search, Plus, Eye, Users } from 'lucide-react';
import { ArticleEditor } from '@/components/admin/ArticleEditor';
import { QuizEditor, QuizQuestion } from '@/components/admin/QuizEditor';
import { SurveyEditor, SurveyQuestion } from '@/components/admin/SurveyEditor';
import { ContentPreview } from '@/components/admin/ContentPreview';
import { ThumbnailUploader } from '@/components/admin/ThumbnailUploader';
import { ContentTable, type Content } from '@/components/admin/ContentTable';
import { ContentBulkActions } from '@/components/admin/ContentBulkActions';
import { useTierSettings } from '@/hooks/useGamification';
import { MEMBER_TYPE_OPTIONS, MEMBER_SUB_TYPES, type MemberType, type TierLevel } from '@/constants/memberTypes';

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

  // ─── Data Fetching ─────────────────────────────────────────
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

      const mappedContents: Content[] = (data || []).map(item => ({
        ...item,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requirements: item.requirements as Record<string, any>
      }));
      setContents(mappedContents);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('ไม่สามารถโหลดข้อมูลเนื้อหาได้');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── CRUD Operations ──────────────────────────────────────
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('กรุณากรอกชื่อเนื้อหา');
      return;
    }

    if (formData.content_type === 'quiz') {
      if (quizQuestions.length === 0) { toast.error('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ'); return; }
      for (const q of quizQuestions) {
        if (!q.question.trim()) { toast.error('กรุณากรอกคำถามให้ครบ'); return; }
        if (q.options.some(o => !o.trim())) { toast.error('กรุณากรอกตัวเลือกให้ครบ'); return; }
      }
    }

    if (formData.content_type === 'survey') {
      if (surveyQuestions.length === 0) { toast.error('กรุณาเพิ่มคำถามอย่างน้อย 1 ข้อ'); return; }
      for (const q of surveyQuestions) {
        if (!q.question.trim()) { toast.error('กรุณากรอกคำถามให้ครบ'); return; }
        if ((q.questionType === 'single_choice' || q.questionType === 'multiple_choice') &&
          q.options.some(o => !o.trim())) { toast.error('กรุณากรอกตัวเลือกให้ครบ'); return; }
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
        const { error } = await supabase.from('content').update(contentData).eq('id', editingContent.id);
        if (error) throw error;
        contentId = editingContent.id;

        if (formData.content_type === 'quiz') {
          await supabase.from('quiz_questions').delete().eq('content_id', contentId);
        } else if (formData.content_type === 'survey') {
          await supabase.from('survey_questions').delete().eq('content_id', contentId);
        }
      } else {
        const { data, error } = await supabase.from('content').insert(contentData).select('id').single();
        if (error) throw error;
        contentId = data.id;
      }

      // Insert quiz questions
      if (formData.content_type === 'quiz' && quizQuestions.length > 0) {
        const quizData = quizQuestions.map((q, index) => ({
          content_id: contentId, question: q.question, options: q.options,
          correct_answer: q.correctAnswer, points: q.points, order_index: index,
        }));
        const { error: quizError } = await supabase.from('quiz_questions').insert(quizData);
        if (quizError) throw quizError;
      }

      // Insert survey questions
      if (formData.content_type === 'survey' && surveyQuestions.length > 0) {
        const surveyData = surveyQuestions.map((q, index) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let optionsJson: any = null;
          switch (q.questionType) {
            case 'single_choice':
            case 'multiple_choice':
              optionsJson = { choices: q.options, allowAdditionalText: q.allowAdditionalText, additionalTextPlaceholder: q.additionalTextPlaceholder };
              if (q.isScreening && q.questionType === 'single_choice') {
                optionsJson.screeningCorrectAnswer = q.options.indexOf(q.screeningLogic?.option || '');
              }
              break;
            case 'image_upload':
              optionsJson = { allowMultipleImages: q.allowMultipleImages, maxImages: q.maxImages };
              break;
            case 'rating':
              optionsJson = { max: q.maxRating || 5 };
              break;
            case 'slider':
              optionsJson = { min: q.sliderMin || 0, max: q.sliderMax || 100, step: q.sliderStep || 1, minLabel: q.sliderMinLabel || '', maxLabel: q.sliderMaxLabel || '' };
              break;
            case 'matrix':
              optionsJson = { rows: (q.matrixRows || []).filter(Boolean), columns: (q.matrixColumns || []).filter(Boolean) };
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
            default: optionsJson = null; break;
          }
          return { content_id: contentId, question: q.question, question_type: q.questionType, options: optionsJson, is_required: q.isRequired, order_index: index };
        });
        const { error: surveyError } = await supabase.from('survey_questions').insert(surveyData);
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
      const { error } = await supabase.from('content').delete().eq('id', id);
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
      const { error } = await supabase.from('content').update({
        is_published: !content.is_published,
        published_at: !content.is_published ? new Date().toISOString() : null,
      }).eq('id', content.id);
      if (error) throw error;
      toast.success(content.is_published ? 'ยกเลิกการเผยแพร่แล้ว' : 'เผยแพร่แล้ว');
      fetchContents();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const handleQuickUpdate = async (id: string, updates: Partial<Content>) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('content').update({
        ...updates,
        requirements: updates.requirements as import('@/integrations/supabase/types').Json | undefined,
        target_tiers: updates.target_tiers as import('@/integrations/supabase/types').Database['public']['Enums']['tier_level'][] | undefined,
        target_member_types: updates.target_member_types as import('@/integrations/supabase/types').Database['public']['Enums']['member_type'][] | undefined
      }).eq('id', id);
      if (error) throw error;
      setContents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('อัพเดทข้อมูลสำเร็จ');
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('ไม่สามารถอัพเดทข้อมูลได้');
    }
  };

  // ─── Form Helpers ─────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      title: '', description: '', content_type: 'article', content_body: '',
      video_url: '', thumbnail_url: '', points_reward: 10, is_published: false,
      target_tiers: [], target_member_types: [],
    });
    setTargetSubTypes({});
    setQuizQuestions([]);
    setSurveyQuestions([]);
    setEditingContent(null);
  };

  const openEditDialog = async (content: Content) => {
    setEditingContent(content);
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

    // Load existing questions
    if (content.content_type === 'quiz') {
      const { data } = await supabase.from('quiz_questions').select('*').eq('content_id', content.id).order('order_index');
      if (data) {
        setQuizQuestions(data.map(q => ({ id: q.id, question: q.question, options: q.options as string[], correctAnswer: q.correct_answer, points: q.points })));
      }
    } else if (content.content_type === 'survey') {
      const { data } = await supabase.from('survey_questions').select('*').eq('content_id', content.id).order('order_index');
      if (data) {
        setSurveyQuestions(data.map(q => {
          let parsedOpts: string[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let extraFields: any = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opts = q.options as Record<string, any>;
          if (opts) {
            if (Array.isArray(opts)) { parsedOpts = opts; }
            else {
              if (opts.choices) parsedOpts = opts.choices;
              if (opts.allowAdditionalText !== undefined) extraFields.allowAdditionalText = opts.allowAdditionalText;
              if (opts.additionalTextPlaceholder !== undefined) extraFields.additionalTextPlaceholder = opts.additionalTextPlaceholder;
              if (opts.allowMultipleImages !== undefined) extraFields.allowMultipleImages = opts.allowMultipleImages;
              if (opts.maxImages !== undefined) extraFields.maxImages = opts.maxImages;
              if (opts.max) extraFields.maxRating = opts.max;
              if (opts.min !== undefined) { extraFields.sliderMin = opts.min; extraFields.sliderMax = opts.max; extraFields.sliderStep = opts.step; extraFields.sliderMinLabel = opts.minLabel; extraFields.sliderMaxLabel = opts.maxLabel; }
              if (opts.rows) { extraFields.matrixRows = opts.rows; extraFields.matrixColumns = opts.columns; }
              if (opts.items) parsedOpts = opts.items;
              if (opts.labels) { extraFields.likertScale = opts.labels.length; extraFields.likertLabels = { left: opts.labels[0] || '', right: opts.labels[opts.labels.length - 1] || '' }; }
              if (opts.screeningCorrectAnswer !== undefined && opts.choices) { extraFields.isScreening = true; extraFields.screeningLogic = { option: opts.choices[opts.screeningCorrectAnswer], action: 'terminate' }; }
            }
          }
          return { id: q.id, question: q.question, questionType: q.question_type as SurveyQuestion['questionType'], options: parsedOpts, isRequired: q.is_required, ...extraFields };
        }));
      }
    } else {
      setQuizQuestions([]);
      setSurveyQuestions([]);
    }

    setIsDialogOpen(true);
  };

  const openPreviewDialog = async (content: Content) => {
    const { data: contentDetails } = await supabase.from('content').select('content_body, video_url, thumbnail_url').eq('id', content.id).single();
    setFormData({
      title: content.title, description: content.description || '',
      content_type: content.content_type as 'article' | 'video' | 'quiz' | 'survey',
      content_body: contentDetails?.content_body || '', video_url: contentDetails?.video_url || '',
      thumbnail_url: contentDetails?.thumbnail_url || '', points_reward: content.points_reward,
      is_published: content.is_published, target_tiers: (content.target_tiers || []) as TierLevel[],
      target_member_types: (content.target_member_types || []) as MemberType[],
    });

    if (content.content_type === 'quiz') {
      const { data } = await supabase.from('quiz_questions').select('*').eq('content_id', content.id).order('order_index');
      if (data) setQuizQuestions(data.map(q => ({ id: q.id, question: q.question, options: q.options as string[], correctAnswer: q.correct_answer, points: q.points })));
      else setQuizQuestions([]);
    } else if (content.content_type === 'survey') {
      const { data } = await supabase.from('survey_questions').select('*').eq('content_id', content.id).order('order_index');
      if (data) setSurveyQuestions(data.map(q => ({ id: q.id, question: q.question, questionType: q.question_type as 'single_choice' | 'multiple_choice' | 'rating' | 'text' | 'likert' | 'ranking' | 'matrix' | 'slider', options: (q.options as string[]) || [], isRequired: q.is_required })));
      else setSurveyQuestions([]);
    } else { setQuizQuestions([]); setSurveyQuestions([]); }

    setIsPreviewOpen(true);
  };

  // ─── Bulk Operations ──────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`คุณต้องการลบเนื้อหาที่เลือก ${selectedIds.length} รายการหรือไม่?`)) return;
    try {
      const { error } = await supabase.from('content').delete().in('id', selectedIds);
      if (error) throw error;
      toast.success(`ลบเนื้อหา ${selectedIds.length} รายการสำเร็จ`);
      setSelectedIds([]); fetchContents();
    } catch (error) { console.error('Error deleting contents:', error); toast.error('ไม่สามารถลบเนื้อหาได้'); }
  };

  const handleBulkPublish = async (isPublished: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase.from('content').update({ is_published: isPublished, published_at: isPublished ? new Date().toISOString() : null }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`${isPublished ? 'เผยแพร่' : 'ยกเลิกการเผยแพร่'}เนื้อหา ${selectedIds.length} รายการสำเร็จ`);
      setSelectedIds([]); fetchContents();
    } catch (error) { console.error('Error updating publish status:', error); toast.error('ไม่สามารถอัปเดตสถานะได้'); }
  };

  const handleBulkEditPoints = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase.from('content').update({ points_reward: bulkPointsValue }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`อัปเดตคะแนน ${selectedIds.length} รายการสำเร็จ`);
      setIsBulkEditPointsOpen(false); setSelectedIds([]); fetchContents();
    } catch (error) { console.error('Error updating points:', error); toast.error('ไม่สามารถอัปเดตคะแนนได้'); }
  };

  const handleBulkEditTiers = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase.from('content').update({ target_tiers: bulkTiersValue.length > 0 ? bulkTiersValue : null }).in('id', selectedIds);
      if (error) throw error;
      toast.success(`อัปเดต Tier ${selectedIds.length} รายการสำเร็จ`);
      setIsBulkEditTiersOpen(false); setSelectedIds([]); fetchContents();
    } catch (error) { console.error('Error updating tiers:', error); toast.error('ไม่สามารถอัปเดต Tier ได้'); }
  };

  const toggleArrayItem = (item: string, currentItems: string[], setter: (items: string[]) => void) => {
    if (currentItems.includes(item)) setter(currentItems.filter(i => i !== item));
    else setter([...currentItems, item]);
  };

  const filteredContents = contents.filter(content =>
    content.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">จัดการเนื้อหา</h1>
          <p className="text-muted-foreground">สร้างและจัดการบทความ, วิดีโอ และแบบทดสอบ</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> สร้างเนื้อหา</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{editingContent ? 'แก้ไขเนื้อหา' : 'สร้างเนื้อหาใหม่'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
              <div className="space-y-6 p-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>ประเภทเนื้อหา</Label>
                    <Select value={formData.content_type} onValueChange={(value: 'article' | 'video' | 'quiz' | 'survey') => { setFormData(prev => ({ ...prev, content_type: value })); setQuizQuestions([]); setSurveyQuestions([]); }} disabled={!!editingContent}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">บทความ</SelectItem>
                        <SelectItem value="video">วิดีโอ</SelectItem>
                        <SelectItem value="quiz">แบบทดสอบ</SelectItem>
                        {editingContent?.content_type === 'survey' && <SelectItem value="survey">แบบสำรวจ</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>คะแนนที่ได้รับ</Label>
                    <Input type="number" value={formData.points_reward} onChange={(e) => setFormData(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ชื่อเนื้อหา *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="ระบุชื่อเนื้อหา" />
                </div>

                <div className="space-y-2">
                  <Label>คำอธิบาย</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="คำอธิบายสั้นๆ" />
                </div>

                <div className="space-y-2">
                  <Label>รูปปก (Thumbnail)</Label>
                  <ThumbnailUploader value={formData.thumbnail_url} onChange={(url) => setFormData(prev => ({ ...prev, thumbnail_url: url }))} bucket="content-thumbnails" />
                </div>

                {formData.content_type === 'article' && <ArticleEditor value={formData.content_body} onChange={(value) => setFormData(prev => ({ ...prev, content_body: value }))} />}
                {formData.content_type === 'video' && (
                  <div className="space-y-2">
                    <Label>URL วิดีโอ</Label>
                    <Input value={formData.video_url} onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))} placeholder="https://..." />
                  </div>
                )}
                {formData.content_type === 'quiz' && <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />}
                {formData.content_type === 'survey' && <SurveyEditor questions={surveyQuestions} onChange={setSurveyQuestions} />}

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
                              <Checkbox id={`member-${type.value}`} checked={isChecked} onCheckedChange={() => {
                                let newTypes: string[];
                                if (isChecked) {
                                  newTypes = formData.target_member_types.filter(t => t !== type.value);
                                  setTargetSubTypes(prev => { const next = { ...prev }; delete next[type.value]; return next; });
                                } else {
                                  newTypes = [...formData.target_member_types, type.value];
                                }
                                setFormData(prev => ({ ...prev, target_member_types: newTypes as MemberType[] }));
                              }} />
                              <label htmlFor={`member-${type.value}`} className="text-sm font-medium leading-none cursor-pointer flex-1">{type.label}</label>
                              {subTypes && <span className="text-xs text-muted-foreground mr-2">({subTypes.length} ประเภทย่อย)</span>}
                            </div>
                            {isChecked && subTypes && (
                              <div className="ml-6 mt-1 mb-2 pl-3 border-l-2 border-primary/30 space-y-1">
                                <p className="text-xs text-muted-foreground mb-1">เลือกประเภทย่อย (ว่าง = ทุกประเภทย่อย)</p>
                                {subTypes.map(sub => (
                                  <div key={sub.value} className="flex items-center space-x-2 p-1.5 rounded bg-background/50">
                                    <Checkbox id={`sub-${type.value}-${sub.value}`} checked={(targetSubTypes[type.value] || []).includes(sub.value)} onCheckedChange={() => {
                                      setTargetSubTypes(prev => {
                                        const current = prev[type.value] || [];
                                        const updated = current.includes(sub.value) ? current.filter(v => v !== sub.value) : [...current, sub.value];
                                        return { ...prev, [type.value]: updated };
                                      });
                                    }} />
                                    <label htmlFor={`sub-${type.value}-${sub.value}`} className="text-xs font-medium leading-none cursor-pointer">{sub.label}</label>
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
                          <Checkbox id={`tier-${tier.value}`} checked={formData.target_tiers.includes(tier.value)} onCheckedChange={() => {
                            toggleArrayItem(tier.value, formData.target_tiers, (items) => setFormData(prev => ({ ...prev, target_tiers: items as TierLevel[] })));
                          }} />
                          <label htmlFor={`tier-${tier.value}`} className="text-sm font-medium leading-none cursor-pointer capitalize">{tier.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Switch checked={formData.is_published} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))} />
                  <Label>เผยแพร่ทันที</Label>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(true)}><Eye className="h-4 w-4 mr-2" /> ดูตัวอย่าง</Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
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
              <Input placeholder="ค้นหาเนื้อหา" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="ประเภทเนื้อหา" /></SelectTrigger>
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
      <ContentTable
        contents={filteredContents}
        isLoading={isLoading}
        tierSettings={tierSettings}
        dynamicTiers={dynamicTiers}
        selectedIds={selectedIds}
        onSelectAll={(checked) => checked ? setSelectedIds(filteredContents.map(c => c.id)) : setSelectedIds([])}
        onSelect={(id, checked) => checked ? setSelectedIds(prev => [...prev, id]) : setSelectedIds(prev => prev.filter(i => i !== id))}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onTogglePublish={togglePublish}
        onPreview={openPreviewDialog}
        onQuickUpdate={handleQuickUpdate}
      />

      {/* Bulk Actions */}
      <ContentBulkActions
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        isBulkEditPointsOpen={isBulkEditPointsOpen}
        onBulkEditPointsOpenChange={setIsBulkEditPointsOpen}
        bulkPointsValue={bulkPointsValue}
        onBulkPointsValueChange={setBulkPointsValue}
        onBulkEditPoints={handleBulkEditPoints}
        isBulkEditTiersOpen={isBulkEditTiersOpen}
        onBulkEditTiersOpenChange={setIsBulkEditTiersOpen}
        bulkTiersValue={bulkTiersValue}
        onBulkTiersValueChange={setBulkTiersValue}
        onBulkEditTiers={handleBulkEditTiers}
        dynamicTiers={dynamicTiers}
        onBulkPublish={handleBulkPublish}
        onBulkDelete={handleBulkDelete}
      />

      {/* Preview */}
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
