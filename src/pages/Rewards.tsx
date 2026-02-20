import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Star, Loader2, Plus, Maximize2, X, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { BottomNavigation } from '@/components/BottomNavigation';
import { cn } from '@/lib/utils';
import type { Tables, Enums } from '@/integrations/supabase/types';
import congratulationsImage from '@/assets/13.png';

type Reward = Tables<'rewards'>;
type TierLevel = Enums<'tier_level'>;
type TierPointsCost = { [key in TierLevel]?: number };

const getRewardPointsCost = (reward: Reward, userTier: TierLevel): number => {
  const tierPointsCost = reward.tier_points_cost as TierPointsCost | null;
  if (tierPointsCost && tierPointsCost[userTier] !== undefined) {
    return tierPointsCost[userTier]!;
  }
  return reward.points_cost;
};

interface RewardCategory {
  id: string;
  name: string;
  slug: string;
}

export default function Rewards() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redeemedRewardName, setRedeemedRewardName] = useState('');

  // Layout & Pagination State
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 5;



  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('reward_categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // Fetch rewards when category changes or on initial load
  useEffect(() => {
    if (user) {
      fetchRewards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Reset page when category or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, viewMode]);

  const fetchRewards = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true);

    // Filter by category if not 'all'
    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query.order('points_cost', { ascending: true });

    if (error) {
      toast({
        title: 'ไม่สามารถโหลดข้อมูลได้',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setRewards(data || []);
    setIsLoading(false);
  }, [toast, selectedCategory]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchRewards,
  });

  const canRedeem = (reward: Reward) => {
    if (!profile) return false;
    const userTier = profile.tier as TierLevel;
    const pointsCost = getRewardPointsCost(reward, userTier);
    if ((profile.total_points ?? 0) < pointsCost) return false;
    if (reward.stock_quantity <= 0) return false;
    if (reward.target_tiers && reward.target_tiers.length > 0) {
      if (!reward.target_tiers.includes(userTier)) return false;
    }
    return true;
  };

  const handleRedeem = async () => {
    if (!profile || !selectedReward) return;

    if (!shippingAddress.trim()) {
      toast({
        title: 'กรุณากรอกที่อยู่',
        description: 'กรุณากรอกที่อยู่สำหรับจัดส่งของรางวัล',
        variant: 'destructive',
      });
      return;
    }

    const userTier = profile.tier as TierLevel;
    const pointsCost = getRewardPointsCost(selectedReward, userTier);

    setIsRedeeming(true);

    try {
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_profile_id: profile.id,
        p_reward_id: selectedReward.id,
        p_points_cost: pointsCost,
        p_shipping_address: shippingAddress.trim(),
        p_notes: notes.trim() || null,
      });

      if (error) {
        const errorMessage = error.message;
        if (errorMessage.includes('Insufficient points')) {
          throw new Error('คะแนนไม่เพียงพอ');
        } else if (errorMessage.includes('Out of stock')) {
          throw new Error('สินค้าหมด');
        } else if (errorMessage.includes('Unauthorized')) {
          throw new Error('ไม่มีสิทธิ์ดำเนินการ');
        } else if (errorMessage.includes('Reward not found')) {
          throw new Error('ไม่พบของรางวัล');
        } else if (errorMessage.includes('not active')) {
          throw new Error('ของรางวัลไม่พร้อมใช้งาน');
        }
        throw error;
      }

      await refreshProfile();
      await fetchRewards();

      /* toast({
        title: 'แลกของรางวัลสำเร็จ',
        description: `คุณได้แลก ${selectedReward.name} เรียบร้อยแล้ว`,
      }); */

      setRedeemedRewardName(selectedReward.name);
      setShowSuccessModal(true); // Open success modal

      setSelectedReward(null);
      setShippingAddress('');
      setNotes('');
    } catch (error) {
      toast({
        title: 'ไม่สามารถแลกของรางวัลได้',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const openRedeemDialog = async (reward: Reward) => {
    if (user) {
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('address, subdistrict, district, province, postal_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fullProfile) {
        const addressParts = [
          fullProfile.address,
          fullProfile.subdistrict,
          fullProfile.district,
          fullProfile.province,
          fullProfile.postal_code,
        ].filter(Boolean);
        setShippingAddress(addressParts.join(' '));
      }
    }
    setSelectedReward(reward);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }



  return (
    <div ref={containerRef} className="min-h-screen bg-background overflow-auto relative pb-24">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {/* Header - White sticky */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">แลกของรางวัล</h1>
          <Button
            variant="ghost"
            className="text-primary"
            onClick={() => navigate('/my-redemptions')}
          >
            ประวัติ
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Points Card - Gradient blue */}
        <Card className="gradient-primary text-white border-0 overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <p className="text-sm text-white/80">คะแนนสะสมของคุณ</p>
                <p className="text-2xl font-bold">
                  {profile?.total_points?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/missions')}
            >
              <Plus className="w-4 h-4 mr-1" />
              สะสมคะแนน
            </Button>
          </CardContent>
        </Card>

        {/* Category Tabs - Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {/* All category button */}
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'flex-shrink-0 rounded-full',
              selectedCategory === 'all' && 'gradient-primary border-0'
            )}
            onClick={() => setSelectedCategory('all')}
          >
            ทั้งหมด
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.slug ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'flex-shrink-0 rounded-full',
                selectedCategory === cat.slug && 'gradient-primary border-0'
              )}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Section Header with View Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">ของรางวัลแนะนำ</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1 bg-muted/20">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Reward List */}
        {rewards.length === 0 ? (
          <Card className="p-8 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">ยังไม่มีของรางวัล</h3>
            <p className="text-muted-foreground">กรุณากลับมาใหม่ภายหลัง</p>
          </Card>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-3"}>
              {rewards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((reward) => {
                const canUserRedeem = canRedeem(reward);
                const isOutOfStock = reward.stock_quantity <= 0;
                const userTier = profile?.tier as TierLevel;
                const pointsCost = userTier ? getRewardPointsCost(reward, userTier) : reward.points_cost;
                const notEnoughPoints = profile && profile.total_points < pointsCost;

                if (viewMode === 'grid') {
                  return (
                    <Card
                      key={reward.id}
                      className={cn(
                        'overflow-hidden h-full flex flex-col',
                        canUserRedeem ? 'hover:shadow-lg' : 'opacity-75'
                      )}
                    >
                      {/* Square Image */}
                      <div
                        className="aspect-square w-full bg-muted relative group cursor-pointer"
                        onClick={() => setPreviewImage(reward.images?.[0] || reward.image_url || '/placeholder.svg')}
                      >
                        <img
                          src={reward.images?.[0] || reward.image_url || '/placeholder.svg'}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">สินค้าหมด</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2 flex-1">{reward.name}</h3>

                        <div className="mt-auto pt-2 space-y-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                            <span className="text-primary font-bold text-sm">
                              {pointsCost.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant={canUserRedeem ? 'default' : 'secondary'}
                            className="w-full h-8 text-xs"
                            onClick={() => openRedeemDialog(reward)}
                            disabled={!canUserRedeem}
                          >
                            {isOutOfStock ? 'หมด' : notEnoughPoints ? 'คะแนนไม่พอ' : 'แลก'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                }

                // List View (Original)
                return (
                  <Card
                    key={reward.id}
                    className={cn(
                      'overflow-hidden transition-all',
                      canUserRedeem ? 'hover:shadow-lg' : 'opacity-75'
                    )}
                  >
                    <div className="flex p-3 gap-3">
                      {/* Square Image */}
                      <div
                        className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted relative group cursor-pointer"
                        onClick={() => setPreviewImage(reward.images?.[0] || reward.image_url || '/placeholder.svg')}
                      >
                        <img
                          src={reward.images?.[0] || reward.image_url || '/placeholder.svg'}
                          alt={reward.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">สินค้าหมด</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-semibold text-base line-clamp-1">{reward.name}</h3>
                          {reward.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {reward.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-primary fill-primary" />
                            <span className="text-primary font-bold">
                              {pointsCost.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">คะแนน</span>
                          </div>
                          <Button
                            size="sm"
                            variant={canUserRedeem ? 'default' : 'secondary'}
                            className="rounded-full"
                            onClick={() => openRedeemDialog(reward)}
                            disabled={!canUserRedeem}
                          >
                            {isOutOfStock ? 'หมด' : notEnoughPoints ? 'คะแนนไม่พอ' : 'แลกรางวัล'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {rewards.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setCurrentPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  หน้าที่ {currentPage} จาก {Math.ceil(rewards.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setCurrentPage(p => Math.min(Math.ceil(rewards.length / itemsPerPage), p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === Math.ceil(rewards.length / itemsPerPage)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />

      {/* Redeem Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการแลกของรางวัล</DialogTitle>
            <DialogDescription>
              คุณกำลังจะแลก <strong>{selectedReward?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              {(() => {
                const userTier = profile?.tier as TierLevel;
                const dialogPointsCost = selectedReward && userTier
                  ? getRewardPointsCost(selectedReward, userTier)
                  : selectedReward?.points_cost || 0;
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span>คะแนนที่ใช้</span>
                      <span className="font-bold text-primary">
                        {dialogPointsCost.toLocaleString()} คะแนน
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>คะแนนคงเหลือหลังแลก</span>
                      <span className="font-semibold">
                        {((profile?.total_points || 0) - dialogPointsCost).toLocaleString()} คะแนน
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div>
              <Label htmlFor="shipping-address">ที่อยู่จัดส่ง *</Label>
              <Textarea
                id="shipping-address"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="กรอกที่อยู่สำหรับจัดส่งของรางวัล"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSelectedReward(null)}
              disabled={isRedeeming}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleRedeem} disabled={isRedeeming}>
              {isRedeeming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                'ยืนยันแลกของรางวัล'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => {
        if (!open) {
          setPreviewImage(null);
          setIsZoomed(false);
        }
      }}>
        <DialogContent className="max-w-screen-md h-[80vh] p-0 flex flex-col bg-black/90 border-0 focus:outline-none overflow-hidden">
          <div className="absolute top-2 right-2 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => {
                setPreviewImage(null);
                setIsZoomed(false);
              }}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center relative">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit={true}
            >
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <img
                  src={previewImage || ''}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>

          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none z-50">
            <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
              ใช้นิ้วถ่างเพื่อขยายรูป
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redemption Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <img
              src={congratulationsImage}
              alt="Congratulations"
              className="w-48 h-auto object-contain animate-bounce-in"
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary">แลกของรางวัลสำเร็จ!</h2>
              <p className="text-muted-foreground">
                คุณได้แลก <span className="text-amber-500 font-bold">{redeemedRewardName}</span> เรียบร้อยแล้ว
              </p>
              <p className="text-sm text-muted-foreground">
                เจ้าหน้าที่จะดำเนินการจัดส่งของรางวัลให้คุณโดยเร็วที่สุด
              </p>
            </div>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full mt-4">
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
