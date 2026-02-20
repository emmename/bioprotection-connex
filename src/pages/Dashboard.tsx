import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyCheckin, usePoints, useCoins, useTierSettings, useDailyMissions } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMemberSubType } from '@/hooks/useMemberSubType';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LevelProgressCard } from '@/components/dashboard/LevelProgressCard';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { DailyCheckinCard } from '@/components/dashboard/DailyCheckinCard';
import { DailyMissionsCard } from '@/components/dashboard/DailyMissionsCard';
import { SpecialMissionsCard } from '@/components/dashboard/SpecialMissionsCard';

import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';
import { TierUpCelebration } from '@/components/dashboard/TierUpCelebration';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Dashboard() {
  const { user, profile, isLoading: authLoading, isApproved, refreshProfile } = useAuth();
  const { points, refreshProfile: refreshPoints } = usePoints(); // transactions not used here
  const { coins, refreshProfile: refreshCoins } = useCoins(); // transactions not used here
  const { todayCheckin, streak, isLoading: checkinLoading, checkin } = useDailyCheckin();
  const { tiers, isLoading: tiersLoading, refetch: refetchTiers } = useTierSettings();
  const { missionStatus, isLoading: missionsLoading } = useDailyMissions();
  const { subTypeLabel } = useMemberSubType(profile);

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState('');
  const prevTierRef = useRef<string | null>(null);

  // Detect tier upgrades
  useEffect(() => {
    if (!profile?.tier) return;

    // Initial load, just set the ref
    if (!prevTierRef.current) {
      prevTierRef.current = profile.tier;
      return;
    }

    // Tier changed
    if (prevTierRef.current !== profile.tier) {
      console.log('Tier upgrade detected:', prevTierRef.current, '->', profile.tier);
      setCelebrationTier(profile.tier);
      setShowCelebration(true);

      // Record notification
      const recordNotification = async () => {
        try {
          console.log('Attempting to record level up notification...');
          const { error } = await supabase.from('notifications').insert({
            profile_id: profile.id,
            title: 'ยินดีด้วย! คุณได้เลื่อนระดับ',
            message: `คุณได้รับการเลื่อนระดับเป็น ${profile.tier} เรียบร้อยแล้ว`,
            type: 'success',
            is_read: false,
          });

          if (error) {
            console.error('Supabase error recording notification:', error);
            throw error;
          }
          console.log('Notification recorded successfully');
        } catch (error) {
          console.error('Error recording notification:', error);
          // Optional: Show toast for debug (can remove later if annoying)
          /* toast({
            variant: "destructive",
            title: "Could not save notification",
            description: error.message
          }); */
        }
      };
      recordNotification();
    }
    prevTierRef.current = profile.tier;
  }, [profile?.tier, profile?.id]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshProfile(),
      refreshPoints(),
      refreshCoins(),
      refetchTiers(),
    ]);
  }, [refreshProfile, refreshPoints, refreshCoins, refetchTiers]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  if (authLoading || checkinLoading || tiersLoading || missionsLoading) {
    return <DashboardSkeleton />;
  }

  // Find current and next tier
  const currentTier = tiers.find(t => t.tier === profile?.tier);
  const currentTierIndex = tiers.findIndex(t => t.tier === profile?.tier);
  const nextTier = tiers[currentTierIndex + 1];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background overflow-auto pb-24"
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
      />

      {showCelebration && (
        <TierUpCelebration
          newTier={celebrationTier}
          onClose={() => setShowCelebration(false)}
        />
      )}

      <DashboardHeader profile={profile} />

      <main className="container mx-auto px-4 py-4 space-y-4">

        {/* Approval Status Banner */}
        {!isApproved && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-center">
            <p className="text-warning font-medium">
              บัญชีของคุณอยู่ระหว่างการตรวจสอบ กรุณารอการอนุมัติจากผู้ดูแลระบบ
            </p>
          </div>
        )}

        {/* Hero Card - Level Progress */}
        <LevelProgressCard
          currentTier={currentTier}
          nextTier={nextTier}
          currentPoints={points}
          memberName={profile?.nickname || profile?.first_name || ''}
          memberType={profile?.member_type}
          avatarUrl={profile?.avatar_url}
          subTypeLabel={subTypeLabel}
        />

        {/* Stats Row - Horizontal Scroll */}
        <StatsCards
          coins={coins}
          tier={profile?.tier || 'bronze'}
          tierDisplayName={currentTier?.display_name}
          streak={streak}
        />

        {/* Quick Actions - Carousel */}
        <QuickActionsCard />

        {/* Daily Check-in */}
        <DailyCheckinCard />

        {/* Daily Missions */}
        <DailyMissionsCard
          todayCheckin={!!todayCheckin}
          onCheckin={checkin}
          isLoading={checkinLoading}
          receiptUploadedToday={missionStatus.receipt}
          articleReadToday={missionStatus.article}
          videoWatchedToday={missionStatus.video}
          quizCompletedToday={missionStatus.quiz}
        />

        {/* Special Missions */}
        <SpecialMissionsCard />


      </main>


    </div>
  );
}
