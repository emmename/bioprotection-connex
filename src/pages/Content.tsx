import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Video, FileQuestion, ClipboardList, Star, CheckCircle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMemberSubType } from '@/hooks/useMemberSubType';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';

import { BottomNavigation } from '@/components/BottomNavigation';

interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'article' | 'video' | 'quiz' | 'survey';
  points_reward: number;
  thumbnail_url: string | null;
  published_at: string | null;
  target_tiers: string[] | null;
  target_member_types: string[] | null;
  requirements?: {
    targeting?: {
      sub_types?: Record<string, string[]>;
      member_types?: string[];
      tiers?: string[];
    };
    reward_overrides?: Array<{ type: string; value: string; sub_type?: string; points: number; coins: number }>;
    [key: string]: unknown;
  };
}

interface ContentProgress {
  content_id: string;
  is_completed: boolean;
  points_earned: number;
}

export default function Content() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { subTypeValue } = useMemberSubType(profile);
  const [contents, setContents] = useState<Content[]>([]);
  const [progress, setProgress] = useState<ContentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('type') || 'all';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab with URL search params
  useEffect(() => {
    const type = searchParams.get('type');
    if (type && type !== activeTab) {
      setActiveTab(type);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams]);

  // Scroll to top when activeTab changes manually
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Layout & Pagination State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 5;
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    // Fetch published content with target_tiers and target_member_types
    const { data: contentData } = await supabase
      .from('content')
      .select('id, title, description, content_type, points_reward, thumbnail_url, published_at, target_tiers, target_member_types, requirements')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    // Cast through unknown since 'requirements' column isn't in generated Supabase types
    const typedContentData = contentData as unknown as Content[] | null;

    if (typedContentData) {
      const userTier = profile?.tier || 'bronze';
      const userMemberType = profile?.member_type || 'other';

      // Filter content based on user's tier and member_type
      const filteredContent = typedContentData.filter((content: Content) => {
        // Check tier access
        const tierAllowed = !content.target_tiers ||
          content.target_tiers.length === 0 ||
          (content.target_tiers as string[]).includes(userTier);

        // Check member_type access
        const memberTypeAllowed = !content.target_member_types ||
          content.target_member_types.length === 0 ||
          (content.target_member_types as string[]).includes(userMemberType);

        // Check sub-type access
        let subTypeAllowed = true;
        if (content.requirements?.targeting?.sub_types) {
          const targetSubTypes = content.requirements.targeting.sub_types[userMemberType];
          if (targetSubTypes && targetSubTypes.length > 0) {
            // If targeting specifies sub-types for this member type, check match
            // If user has no sub-type (e.g. loading or error), strictly they don't match
            if (!subTypeValue || !targetSubTypes.includes(subTypeValue)) {
              subTypeAllowed = false;
            }
          }
        }

        return tierAllowed && memberTypeAllowed && subTypeAllowed;
      });

      setContents(filteredContent);
    }

    // Fetch user progress if logged in
    if (profile) {
      const { data: progressData } = await supabase
        .from('content_progress')
        .select('content_id, is_completed, points_earned')
        .eq('profile_id', profile.id);

      if (progressData) {
        setProgress(progressData);
      }
    }

    setIsLoading(false);
  }, [profile, subTypeValue]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchData,
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortOrder]);

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

  const isCompleted = (contentId: string) => {
    return progress.some((p) => p.content_id === contentId && p.is_completed);
  };

  const filteredContents = contents
    .filter((content) => {
      if (activeTab === 'all') return true;
      return content.content_type === activeTab;
    })
    .sort((a, b) => {
      const dateA = new Date(a.published_at || 0).getTime();
      const dateB = new Date(b.published_at || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Pagination Logic
  const totalPages = Math.ceil(filteredContents.length / itemsPerPage);
  const paginatedContents = filteredContents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of content list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-primary" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background overflow-auto relative flex flex-col">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">คอนเทนต์</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  อ่านบทความ ดูวิดีโอ และรับคะแนน
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8"
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="text-xs">{sortOrder === 'newest' ? 'ล่าสุด' : 'เก่าสุด'}</span>
              </Button>

              {/* View Toggle */}
              <div className="flex items-center border rounded-lg p-1 bg-muted/20">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted rounded-lg flex no-scrollbar">
            <TabsTrigger value="all" className="flex-1 min-w-fit px-3 data-[state=active]:bg-[#165fcc] data-[state=active]:text-white">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="article" className="flex-1 min-w-fit px-3 data-[state=active]:bg-[#165fcc] data-[state=active]:text-white">บทความ</TabsTrigger>
            <TabsTrigger value="video" className="flex-1 min-w-fit px-3 data-[state=active]:bg-[#165fcc] data-[state=active]:text-white">วิดีโอ</TabsTrigger>
            <TabsTrigger value="quiz" className="flex-1 min-w-fit px-3 data-[state=active]:bg-[#165fcc] data-[state=active]:text-white">แบบทดสอบ</TabsTrigger>
            <TabsTrigger value="survey" className="flex-1 min-w-fit px-3 data-[state=active]:bg-[#165fcc] data-[state=active]:text-white">แบบสำรวจ</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content List */}
        {filteredContents.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">ยังไม่มีคอนเทนต์</h3>
              <p className="text-muted-foreground">
                กลับมาดูใหม่ภายหลังนะ!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? "grid gap-4 grid-cols-2" : "flex flex-col gap-4"}>
            {paginatedContents.map((content) => {
              const completed = isCompleted(content.id);

              if (viewMode === 'list') {
                // List View (Horizontal Card)
                return (
                  <Link key={content.id} to={`/content/${content.id}`}>
                    <Card className="card-hover overflow-hidden h-full flex flex-row">
                      {/* Thumbnail (Left) */}
                      <div className="relative w-[150px] sm:w-[240px] shrink-0 aspect-video bg-muted border-r self-start">
                        {content.thumbnail_url ? (
                          <img
                            src={content.thumbnail_url}
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center gradient-primary opacity-50">
                            {getContentIcon(content.content_type)}
                          </div>
                        )}

                        {/* Completed Check (Small) */}
                        {completed && (
                          <div className="absolute top-1 right-1">
                            <div className="bg-accent text-accent-foreground rounded-full p-0.5">
                              <CheckCircle className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-3 flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs px-2 h-6 bg-muted">
                              {getContentTypeLabel(content.content_type)}
                            </Badge>
                            {content.published_at && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(content.published_at).toLocaleDateString('th-TH')}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1">{content.title}</h3>
                          {content.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">
                              {content.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-end mt-1">
                          <div className="flex items-center gap-1 text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-medium">
                              {content.points_reward}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              } else {
                // Grid View (Vertical Card - Existing Style)
                return (
                  <Link key={content.id} to={`/content/${content.id}`}>
                    <Card className="card-hover overflow-hidden h-full flex flex-col">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-muted shrink-0">
                        {content.thumbnail_url ? (
                          <img
                            src={content.thumbnail_url}
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center gradient-primary opacity-50">
                            {getContentIcon(content.content_type)}
                          </div>
                        )}

                        {/* Completed Badge */}
                        {completed && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5 h-5">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              เสร็จแล้ว
                            </Badge>
                          </div>
                        )}

                        {/* Content Type Badge */}
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px] px-1.5 h-5">
                            {getContentIcon(content.content_type)}
                            <span className="ml-1">{getContentTypeLabel(content.content_type)}</span>
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-3 flex-1 flex flex-col">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 flex-1">{content.title}</h3>

                        <div className="flex items-center justify-between mt-auto pt-2">
                          <div className="flex items-center gap-1 text-warning">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-xs font-medium">
                              {content.points_reward}
                            </span>
                          </div>
                          {content.published_at && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(content.published_at).toLocaleDateString('th-TH')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              }
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredContents.length > 0 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              หน้าที่ {currentPage} จาก {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
}
