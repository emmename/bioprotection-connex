import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle, Clock, BookOpen, Video, FileQuestion, ClipboardList, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import QuizPlayer from '@/components/content/QuizPlayer';
import SurveyPlayer from '@/components/content/SurveyPlayer';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import contentSuccessImage from '@/assets/2.png';

interface ContentData {
  id: string;
  title: string;
  description: string | null;
  content_body: string | null;
  content_type: 'article' | 'video' | 'quiz' | 'survey';
  points_reward: number;
  thumbnail_url: string | null;
  video_url: string | null;
  published_at: string | null;
}

interface ContentProgress {
  id: string;
  is_completed: boolean;
  points_earned: number;
  completed_at: string | null;
  quiz_score: number | null;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  points: number;
  order_index: number;
}

interface SurveyQuestion {
  id: string;
  question: string;
  question_type: string;
  options: Json;
  is_required: boolean;
  order_index: number;
}

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [content, setContent] = useState<ContentData | null>(null);
  const [progress, setProgress] = useState<ContentProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(0);


  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch content
      const { data: contentData, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !contentData) {
        navigate('/content');
        return;
      }

      setContent(contentData as ContentData);

      // Fetch user progress
      if (profile) {
        const { data: progressData } = await supabase
          .from('content_progress')
          .select('id, is_completed, points_earned, completed_at, quiz_score')
          .eq('profile_id', profile.id)
          .eq('content_id', id)
          .maybeSingle();

        if (progressData) {
          setProgress(progressData);
        }
      }

      // Fetch quiz questions if content type is quiz
      if (contentData.content_type === 'quiz') {
        const { data: quizData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('content_id', id)
          .order('order_index');

        if (quizData) {
          setQuizQuestions(
            quizData.map((q) => ({
              ...q,
              options: Array.isArray(q.options) ? q.options as string[] : [],
            }))
          );
        }
      }

      // Fetch survey questions if content type is survey
      if (contentData.content_type === 'survey') {
        const { data: surveyData } = await supabase
          .from('survey_questions')
          .select('*')
          .eq('content_id', id)
          .order('order_index');

        if (surveyData) {
          setSurveyQuestions(surveyData);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [id, profile, navigate]);

  useEffect(() => {
    // Timer for article content
    let timer: NodeJS.Timeout;
    if (content?.content_type === 'article' && !progress?.is_completed && !isLoading) {
      setCountdown(30); // Set initial countdown to 30 seconds

      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [content?.content_type, content?.id, progress?.is_completed, isLoading]);

  const handleComplete = async () => {
    if (!profile || !content || progress?.is_completed) return;

    setIsCompleting(true);

    try {
      const now = new Date().toISOString();

      // Use upsert to handle both insert and update cases safely
      const { error: opError } = await supabase
        .from('content_progress')
        .upsert({
          profile_id: profile.id,
          content_id: content.id,
          is_completed: true,
          progress_percent: 100,
          points_earned: content.points_reward,
          completed_at: now,
          updated_at: now,
        }, {
          onConflict: 'profile_id,content_id'
        });

      if (opError) throw opError;

      // Add points to profile using RPC function (Wrapped in try/catch to prevent blocking completion)
      try {
        const { error: pointsError } = await supabase.rpc('add_points', {
          p_profile_id: profile.id,
          p_amount: content.points_reward,
          p_source: 'reading',
          p_description: `อ่าน: ${content.title}`,
        });

        if (pointsError) {
          console.error('Failed to add points:', pointsError);
          // Don't throw here, just log. The content progress is already saved.
          toast({
            variant: 'secondary',
            title: 'บันทึกสำเร็จ',
            description: 'บันทึกการอ่านแล้ว (แต่อาจมีปัญหาการเพิ่มคะแนน)',
          });
        }
      } catch (err) {
        console.error('Error invoking add_points:', err);
      }

      await refreshProfile();

      setProgress({
        id: progress?.id || '',
        is_completed: true,
        points_earned: content.points_reward,
        completed_at: now,
        quiz_score: null,
      });

      /* toast({
        title: '🎉 ยินดีด้วย!',
        description: `คุณได้รับ ${content.points_reward} คะแนน`,
      }); */
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error completing content:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถบันทึกความคืบหน้าได้',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleQuizComplete = async (score: number, earnedPoints: number) => {
    if (!profile || !content || progress?.is_completed) return;

    try {
      const now = new Date().toISOString();

      // Use upsert for quiz completion
      const { error: opError } = await supabase
        .from('content_progress')
        .upsert({
          profile_id: profile.id,
          content_id: content.id,
          is_completed: true,
          progress_percent: 100,
          points_earned: earnedPoints,
          quiz_score: score,
          completed_at: now,
          updated_at: now,
        }, {
          onConflict: 'profile_id,content_id'
        });

      if (opError) throw opError;

      // Add earned points
      if (earnedPoints > 0) {
        const { error: pointsError } = await supabase.rpc('add_points', {
          p_profile_id: profile.id,
          p_amount: earnedPoints,
          p_source: 'quiz',
          p_description: `ทำแบบทดสอบ: ${content.title}`,
        });

        if (pointsError) throw pointsError;
      }

      await refreshProfile();

      setProgress({
        id: progress?.id || '',
        is_completed: true,
        points_earned: earnedPoints,
        completed_at: now,
        quiz_score: score,
      });

      /* toast({
        title: '🎉 ยินดีด้วย!',
        description: `คุณได้รับ ${earnedPoints} คะแนนจากแบบทดสอบ`,
      }); */
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกผลแบบทดสอบได้',
      });
    }
  };

  const handleSurveyComplete = async (responses: Record<string, Json>) => {
    if (!profile || !content || progress?.is_completed) return;

    try {
      const now = new Date().toISOString();

      // Use upsert for survey completion
      const { error: opError } = await supabase
        .from('content_progress')
        .upsert({
          profile_id: profile.id,
          content_id: content.id,
          is_completed: true,
          progress_percent: 100,
          points_earned: content.points_reward,
          survey_responses: responses,
          completed_at: now,
          updated_at: now,
        }, {
          onConflict: 'profile_id,content_id'
        });

      if (opError) throw opError;

      // Add points for completing survey
      const { error: pointsError } = await supabase.rpc('add_points', {
        p_profile_id: profile.id,
        p_amount: content.points_reward,
        p_source: 'survey',
        p_description: `ทำแบบสำรวจ: ${content.title}`,
      });

      if (pointsError) throw pointsError;

      await refreshProfile();

      setProgress({
        id: progress?.id || '',
        is_completed: true,
        points_earned: content.points_reward,
        completed_at: now,
        quiz_score: null,
      });

      /* toast({
        title: '🎉 ขอบคุณ!',
        description: `คุณได้รับ ${content.points_reward} คะแนนจากแบบสำรวจ`,
      }); */
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error completing survey:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกแบบสำรวจได้',
      });
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <BookOpen className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'quiz':
        return <FileQuestion className="w-5 h-5" />;
      case 'survey':
        return <ClipboardList className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'article':
        return 'บทความ';
      case 'video':
        return 'วิดีโอ';
      case 'quiz':
        return 'แบบทดสอบ';
      case 'survey':
        return 'แบบสำรวจ';
      default:
        return type;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-primary" />
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/content')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getContentIcon(content.content_type)}
                  <span className="ml-1">{getContentTypeLabel(content.content_type)}</span>
                </Badge>
                {progress?.is_completed && (
                  <Badge className="bg-accent text-accent-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    เสร็จแล้ว
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Thumbnail */}
        {content.thumbnail_url && (
          <div className="relative aspect-video bg-muted rounded-xl overflow-hidden mb-6">
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Video Player with tracking */}
        {content.content_type === 'video' && content.video_url && (
          <div className="space-y-2 mb-6">
            <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
              <video
                src={content.video_url}
                className="w-full h-full"
                controls
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  const percentWatched = (video.currentTime / video.duration) * 100;
                  setVideoProgress(Math.round(percentWatched));
                  if (percentWatched >= 90 && !videoWatched) {
                    setVideoWatched(true);
                  }
                }}
                onEnded={() => setVideoWatched(true)}
              />
            </div>
            {!progress?.is_completed && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>ความคืบหน้า</span>
                  <span>{videoProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                {!videoWatched && (
                  <p className="text-xs text-muted-foreground">ดูวิดีโออย่างน้อย 90% เพื่อรับคะแนน</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Title & Meta */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{content.title}</h1>
          {content.description && (
            <p className="text-muted-foreground mb-4">{content.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-warning">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{content.points_reward} คะแนน</span>
            </div>
            {content.published_at && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(content.published_at).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Body - for articles/videos */}
        {(content.content_type === 'article' || content.content_type === 'video') && content.content_body && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div
                className="prose prose-sm max-w-none dark:prose-invert break-words [&_a]:break-all [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_br]:block [&_br]:content-[''] [&_br]:mt-2"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const clean = DOMPurify.sanitize(content.content_body, {
                      ADD_TAGS: ['iframe'],
                      ADD_ATTR: ['class', 'target', 'src', 'frameborder', 'allow', 'allowfullscreen', 'scrolling'],
                      ALLOWED_URI_REGEXP: /^(?:(?:https?:)?\/\/|\/|#|mailto:|tel:)/i,
                    });
                    return clean;
                  })()
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Quiz Player */}
        {content.content_type === 'quiz' && quizQuestions.length > 0 && !progress?.is_completed && (
          <div className="mb-6">
            <QuizPlayer questions={quizQuestions} onComplete={handleQuizComplete} />
          </div>
        )}

        {/* Survey Player */}
        {content.content_type === 'survey' && surveyQuestions.length > 0 && !progress?.is_completed && (
          <div className="mb-6">
            <SurveyPlayer questions={surveyQuestions} onComplete={handleSurveyComplete} />
          </div>
        )}

        {/* Complete Status or Button */}
        <div className="sticky bottom-4">
          {progress?.is_completed ? (
            <Card className="bg-accent/10 border-accent/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-accent">เสร็จสิ้นแล้ว!</p>
                    <p className="text-sm text-muted-foreground">
                      ได้รับ {progress.points_earned} คะแนน
                      {progress.quiz_score !== null && ` (ตอบถูก ${progress.quiz_score} ข้อ)`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {progress.completed_at &&
                    new Date(progress.completed_at).toLocaleDateString('th-TH')}
                </span>
              </CardContent>
            </Card>
          ) : content.content_type === 'article' ? (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || countdown > 0}
              className={`w-full py-6 text-lg transition-all duration-300 ${countdown > 0
                ? 'bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed'
                : 'gradient-accent text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                }`}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : countdown > 0 ? (
                <>
                  <Clock className="w-5 h-5 mr-2 animate-pulse" />
                  กรุณาอ่านบทความ ({countdown} วินาที)
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2 animate-bounce-in" />
                  อ่านจบ - รับ {content.points_reward} คะแนน
                </>
              )}
            </Button>
          ) : content.content_type === 'video' ? (
            <Button
              onClick={handleComplete}
              disabled={isCompleting || !videoWatched}
              className="w-full gradient-accent text-white py-6 text-lg"
            >
              {isCompleting ? 'กำลังบันทึก...' : !videoWatched ? (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  ดูวิดีโอให้จบก่อน ({videoProgress}%)
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  ดูจบ - รับ {content.points_reward} คะแนน
                </>
              )}
            </Button>
          ) : null}
        </div>
        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md text-center">
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <img
                src={contentSuccessImage}
                alt="Content Completed"
                className="w-48 h-auto object-contain animate-bounce-in"
              />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-primary">ยอดเยี่ยมมาก!</h2>
                <p className="text-muted-foreground">
                  คุณทำภารกิจสำเร็จและได้รับ <span className="text-amber-500 font-bold">{content.points_reward}</span> คะแนน
                </p>
                <p className="text-sm text-muted-foreground">
                  อย่าลืมกลับมาเรียนรู้เพิ่มเติมในวันพรุ่งนี้นะครับ
                </p>
              </div>
              <Button onClick={() => setShowSuccessModal(false)} className="w-full mt-4">
                ตกลง
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
