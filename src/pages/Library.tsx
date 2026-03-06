import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Image as ImageIcon, FileText, Video, FolderOpen, Download, ExternalLink, ChevronRight, X, ChevronLeft, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { PageHeader } from '@/components/ui/PageHeader';
import poultryIcon from '@/assets/New folder/poultry_library_364 x 180 px.png';
import cattleIcon from '@/assets/New folder/cattle_library_364 x 180 px.png';
import pigIcon from '@/assets/New folder/pig_library_364 x 180 px.png';

interface LibraryCategory {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    sort_order: number;
    is_active: boolean;
}

interface LibraryItem {
    id: string;
    category_id: string;
    title: string;
    description: string | null;
    item_type: 'article' | 'image' | 'pdf' | 'video';
    content_body: string | null;
    file_url: string | null;
    thumbnail_url: string | null;
    is_published: boolean;
    sort_order: number;
    target_tiers: string[] | null;
    target_member_types: string[] | null;
    created_at: string;
}

const CATEGORY_ICONS: Record<string, string> = {
    'สัตว์ปีก': poultryIcon,
    'โค': cattleIcon,
    'สุกร': pigIcon,
};

const DEFAULT_CATEGORY_ICON = '';

export default function Library() {
    const navigate = useNavigate();
    const { profile, isLoading: authLoading } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [categories, setCategories] = useState<LibraryCategory[]>([]);
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const selectedCategoryId = searchParams.get('category');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: catData } = await (supabase as any).from('library_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (catData) setCategories(catData);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: itemData } = await (supabase as any).from('library_items')
            .select('*')
            .eq('is_published', true)
            .order('sort_order', { ascending: true });

        if (itemData) setItems(itemData);
        setIsLoading(false);
    }, []);

    const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
        onRefresh: fetchData,
    });

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'article': return <BookOpen className="w-5 h-5" />;
            case 'image': return <ImageIcon className="w-5 h-5" />;
            case 'pdf': return <FileText className="w-5 h-5" />;
            case 'video': return <Video className="w-5 h-5" />;
            default: return <BookOpen className="w-5 h-5" />;
        }
    };

    const getItemTypeLabel = (type: string) => {
        switch (type) {
            case 'article': return 'บทความ';
            case 'image': return 'รูปภาพ';
            case 'pdf': return 'PDF';
            case 'video': return 'วิดีโอ';
            default: return type;
        }
    };

    const getItemTypeBadgeClass = (type: string) => {
        switch (type) {
            case 'article': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'image': return 'bg-green-50 text-green-700 border-green-200';
            case 'pdf': return 'bg-orange-50 text-[#8B4513] border-orange-200';
            case 'video': return 'bg-red-50 text-red-700 border-red-200';
            default: return '';
        }
    };

    const selectedCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : null;

    // Filter items based on access controls
    const visibleItems = items.filter(item => {
        // Exclude if user doesn't match target member types
        if (item.target_member_types && item.target_member_types.length > 0) {
            if (!profile?.member_type || !item.target_member_types.includes(profile.member_type)) {
                return false;
            }
        }

        // Exclude if user doesn't match target tiers
        if (item.target_tiers && item.target_tiers.length > 0) {
            if (!profile?.tier || !item.target_tiers.includes(profile.tier)) {
                return false;
            }
        }

        return true;
    });

    const filteredItems = selectedCategoryId
        ? visibleItems.filter(i => i.category_id === selectedCategoryId)
        : visibleItems;

    const handleSelectCategory = (catId: string) => {
        setSearchParams({ category: catId });
    };

    const handleBack = () => {
        if (selectedCategoryId) {
            setSearchParams({});
        } else {
            navigate('/dashboard');
        }
    };

    const handleOpenItem = (item: LibraryItem) => {
        setSelectedItem(item);
    };

    const renderVideoEmbed = (url: string) => {
        // YouTube
        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            return (
                <iframe
                    src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                    className="w-full aspect-video rounded-lg"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            );
        }

        // Google Drive
        const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) {
            return (
                <div className="relative">
                    <iframe
                        src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
                        className="w-full aspect-video rounded-lg"
                        allowFullScreen
                        allow="autoplay"
                    />
                    {/* Invisible overlay to block the pop-out icon on the top right */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-transparent z-10" />
                </div>
            );
        }

        // Direct video
        return (
            <video controls className="w-full rounded-lg" src={url}>
                Your browser does not support the video tag.
            </video>
        );
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-primary" />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-background overflow-auto relative flex flex-col pb-4">
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

            {/* Header */}
            <PageHeader
                title={selectedCategory ? selectedCategory.name : 'คลังความรู้'}
                onBack={handleBack}
            />

            <main className="container mx-auto max-w-lg px-4 py-4 flex-1">
                {/* Category Grid (when no category selected) */}
                {!selectedCategoryId && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">เลือกหมวดหมู่ที่สนใจ</p>
                        <div className="flex flex-col gap-4 py-2">
                            {categories.map(cat => {
                                const itemCount = visibleItems.filter(i => i.category_id === cat.id).length;
                                const iconSrc = CATEGORY_ICONS[cat.name] || DEFAULT_CATEGORY_ICON;
                                return (
                                    <Card
                                        key={cat.id}
                                        className="cursor-pointer card-hover border-none shadow-lg bg-gradient-to-br from-white to-secondary/40 transition-all duration-500 hover:shadow-2xl hover:scale-[1.03] overflow-hidden group relative h-[170px]"
                                        onClick={() => handleSelectCategory(cat.id)}
                                    >
                                        <CardContent className="h-full p-4 flex items-center justify-between relative z-10">
                                            <div className="group-hover:scale-110 transition-transform duration-500 h-full flex flex-1 items-center justify-center overflow-hidden">
                                                {iconSrc ? (
                                                    <img loading="lazy" src={iconSrc} alt={cat.name} className="h-full max-w-full object-contain" />
                                                ) : (
                                                    <FolderOpen className="w-20 h-20 text-muted-foreground/50" />
                                                )}
                                            </div>
                                            <div className="w-14 h-14 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-sm ml-4 border">
                                                <ChevronRight className="w-8 h-8" />
                                            </div>
                                        </CardContent>

                                        {/* Background Decoration */}
                                        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                                        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
                                    </Card>
                                );
                            })}
                        </div>

                        {categories.length === 0 && (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">ยังไม่มีหมวดหมู่</h3>
                                    <p className="text-muted-foreground">กลับมาดูใหม่ภายหลังนะ!</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Items List (when category selected) */}
                {selectedCategoryId && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-sm font-semibold text-muted-foreground">{filteredItems.length} รายการ</h2>
                            <div className="flex bg-muted/60 rounded-md p-1 items-center">
                                <Button
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setViewMode('list')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {filteredItems.length === 0 ? (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                                    <h3 className="text-lg font-medium mb-2">ยังไม่มีเนื้อหา</h3>
                                    <p className="text-muted-foreground">กลับมาดูใหม่ภายหลังนะ!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
                                {filteredItems.map(item => (
                                    <Card
                                        key={item.id}
                                        className="cursor-pointer card-hover overflow-hidden group hover:shadow-md transition-all duration-300"
                                        onClick={() => handleOpenItem(item)}
                                    >
                                        {viewMode === 'grid' ? (
                                            <div className="flex flex-col h-full">
                                                <div className="w-full aspect-video bg-muted overflow-hidden flex items-center justify-center relative">
                                                    {item.thumbnail_url ? (
                                                        <img loading="lazy" src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center gradient-primary opacity-50">
                                                            {getItemIcon(item.item_type)}
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 h-5 shadow-sm bg-white/90 backdrop-blur-sm border-white/20 ${getItemTypeBadgeClass(item.item_type).split(' ').find(c => c.startsWith('text-')) || ''}`}>
                                                            {getItemTypeLabel(item.item_type)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="p-3 flex-1 flex flex-col min-w-0">
                                                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h3>
                                                    {item.description && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 flex-1">{item.description}</p>
                                                    )}
                                                    <div className="text-[10px] text-muted-foreground mt-auto pt-2 border-t flex justify-between items-center">
                                                        <span>{new Date(item.created_at).toLocaleDateString('th-TH')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-3">
                                                {/* Thumbnail */}
                                                <div className="w-[120px] aspect-video rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                    {item.thumbnail_url ? (
                                                        <img loading="lazy" src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center gradient-primary opacity-50">
                                                            {getItemIcon(item.item_type)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 self-start pt-1">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <Badge variant="outline" className={`text-[10px] px-1.5 h-5 ${getItemTypeBadgeClass(item.item_type)}`}>
                                                            {getItemTypeLabel(item.item_type)}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground mr-1">
                                                            {new Date(item.created_at).toLocaleDateString('th-TH')}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
                                                    {item.description && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
                                                    )}
                                                </div>

                                                {/* Arrow */}
                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ===== Item Detail Dialog ===== */}
            <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="pr-8">{selectedItem?.title}</DialogTitle>
                        {selectedItem?.description && (
                            <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                        )}
                    </DialogHeader>

                    <div className="px-6 pb-6 overflow-auto max-h-[calc(90vh-120px)]">
                        {selectedItem?.item_type === 'article' && selectedItem.content_body && (
                            <div
                                className="prose prose-sm max-w-none mt-4"
                                dangerouslySetInnerHTML={{ __html: selectedItem.content_body }}
                            />
                        )}

                        {selectedItem?.item_type === 'image' && selectedItem.file_url && (
                            <div className="mt-4">
                                <img
                                    loading="lazy"
                                    src={selectedItem.file_url}
                                    alt={selectedItem.title}
                                    className="w-full rounded-lg"
                                />
                                <div className="flex justify-end mt-3">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={selectedItem.file_url} target="_blank" rel="noopener" download>
                                            <Download className="w-4 h-4 mr-2" /> ดาวน์โหลด
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {selectedItem?.item_type === 'video' && selectedItem.file_url && (
                            <div className="mt-4">
                                {renderVideoEmbed(selectedItem.file_url)}
                            </div>
                        )}

                        {selectedItem?.item_type === 'pdf' && selectedItem.file_url && (
                            <div className="mt-4 relative" onContextMenu={(e) => e.preventDefault()}>
                                {/* Disable printing when PDF is open */}
                                <style>{`
                                    @media print {
                                        body { display: none !important; }
                                    }
                                `}</style>
                                <div className="absolute top-0 left-0 w-full h-12 bg-transparent z-10" title="ป้องกันการคลิกที่ขอบด้านบน" />
                                <iframe
                                    src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedItem.file_url)}&embedded=true`}
                                    className="w-full h-[60vh] rounded-lg border bg-muted"
                                    title={selectedItem.title}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
