import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TierSettings,
  PointsTransaction,
  CoinsTransaction,
  DailyCheckin,
  Mission,
  DailyMissionStatus
} from '@/types/gamification';

// Re-export TierSettings for backward compatibility if needed, or prefer using the one from types
export type { TierSettings };

export function useTierSettings() {
  const [tiers, setTiers] = useState<TierSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTiers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('tier_settings')
      .select('*')
      .order('min_points', { ascending: true });

    if (data) {
      setTiers(data as TierSettings[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  return { tiers, isLoading, refetch: fetchTiers };
}

export function usePoints() {
  const { profile, refreshProfile, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setTransactions(data as PointsTransaction[]);
      }
      setIsLoading(false);
    };

    fetchTransactions();
  }, [profile, authLoading]);

  return {
    points: profile?.total_points || 0,
    transactions,
    isLoading: authLoading || isLoading,
    refreshProfile
  };
}

export function useCoins() {
  const { profile, refreshProfile, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<CoinsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setIsLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      const { data } = await supabase
        .from('coins_transactions')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setTransactions(data as CoinsTransaction[]);
      }
      setIsLoading(false);
    };

    fetchTransactions();
  }, [profile, authLoading]);

  return {
    coins: profile?.total_coins || 0,
    transactions,
    isLoading: authLoading || isLoading,
    refreshProfile
  };
}

export function useDailyCheckin() {
  const { profile, refreshProfile, isLoading: authLoading } = useAuth();
  const [todayCheckin, setTodayCheckin] = useState<DailyCheckin | null>(null);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setIsLoading(false);
      return;
    }

    const fetchCheckin = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('checkin_date', today)
        .maybeSingle();

      if (data) {
        setTodayCheckin(data as DailyCheckin);
        setStreak(data.streak_count);
      }
      setIsLoading(false);
    };

    fetchCheckin();
  }, [profile, authLoading]);

  const checkin = async () => {
    if (!profile || todayCheckin) return { success: false, message: 'Already checked in' };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get yesterday's checkin for streak
    const { data: yesterdayCheckin } = await supabase
      .from('daily_checkins')
      .select('streak_count')
      .eq('profile_id', profile.id)
      .eq('checkin_date', yesterday)
      .maybeSingle();

    const newStreak = yesterdayCheckin ? yesterdayCheckin.streak_count + 1 : 1;
    const dayNumber = ((newStreak - 1) % 7) + 1;

    // Get reward for this day
    const { data: reward } = await supabase
      .from('checkin_rewards')
      .select('coins_reward')
      .eq('day_number', dayNumber)
      .single();

    const coinsEarned = reward?.coins_reward || 5;

    const { error } = await supabase
      .from('daily_checkins')
      .insert({
        profile_id: profile.id,
        checkin_date: today,
        streak_count: newStreak,
        coins_earned: coinsEarned,
      })
      .select()
      .single();

    if (error) return { success: false, message: error.message };

    // Add coins to profile using RPC function (includes authorization checks and transaction logging)
    await supabase.rpc('add_coins', {
      p_profile_id: profile.id,
      p_amount: coinsEarned,
      p_source: 'daily_checkin',
      p_description: `Day ${dayNumber} check-in reward`
    });

    await refreshProfile();
    // Re-fetch to rely on the server response or optimistic update (here optimistic for speed/simple)
    const newCheckin: DailyCheckin = {
      id: 'temp-id',
      profile_id: profile.id,
      checkin_date: today,
      streak_count: newStreak,
      coins_earned: coinsEarned,
      created_at: new Date().toISOString()
    };
    setTodayCheckin(newCheckin);
    setStreak(newStreak);

    return { success: true, coinsEarned, streak: newStreak };
  };

  return { todayCheckin, streak, isLoading: authLoading || isLoading, checkin };
}

export function useDailyMissions() {
  const { profile } = useAuth();
  const [missionStatus, setMissionStatus] = useState<DailyMissionStatus>({
    checkin: false,
    receipt: false,
    article: false,
    video: false,
    quiz: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const { todayCheckin, isLoading: checkinLoading } = useDailyCheckin();

  useEffect(() => {
    if (!profile) {
      if (!checkinLoading) setIsLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const fetchProgress = async () => {
      // Check Receipt
      const { data: receiptData } = await supabase
        .from('receipts')
        .select('id')
        .eq('profile_id', profile.id)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59.999`)
        .in('status', ['pending', 'approved'])
        .limit(1);

      // Check Content
      const { data: contentData } = await supabase
        .from('content_progress')
        .select('id, content:content_id(content_type)')
        .eq('profile_id', profile.id)
        .eq('is_completed', true)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59.999`)
        .limit(50);

      let article = false;
      let video = false;
      let quiz = false;

      if (contentData) {
        const types = contentData.map((d: { content?: { content_type?: string } | null }) => d.content?.content_type);
        article = types.includes('article');
        video = types.includes('video');
        quiz = types.includes('quiz');
      }

      setMissionStatus({
        checkin: !!todayCheckin,
        receipt: !!receiptData && receiptData.length > 0,
        article,
        video,
        quiz
      });
      setIsLoading(false);
    };

    fetchProgress();
  }, [profile, todayCheckin, checkinLoading]);


  return { missionStatus, isLoading: isLoading || checkinLoading };
}

export function useSpecialMissions() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<(Mission & { display_points: number })[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch active missions
      const { data: missionsData, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        // Filter out expired missions if end_date is set
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching special missions:', error);
      }

      if (missionsData) {
        const typedMissions = missionsData as Mission[];

        // Filter and Calculate Rewards
        const processedMissions = typedMissions.filter(mission => {
          const targeting = mission.requirements?.targeting;

          // Check Member Type targeting
          if (targeting?.member_types && targeting.member_types.length > 0) {
            if (!profile.member_type || !targeting.member_types.includes(profile.member_type)) {
              return false;
            }
          }

          // Check Tier targeting
          if (targeting?.tiers && targeting.tiers.length > 0) {
            if (!profile.tier || !targeting.tiers.includes(profile.tier)) {
              return false;
            }
          }

          return true;
        }).map(mission => {
          let points = mission.points_reward;

          // Calculate dynamic rewards if overrides exist
          if (mission.requirements?.reward_overrides) {
            // Priority 1: Member Type
            const memberTypeOverride = mission.requirements.reward_overrides.find(
              r => r.type === 'member_type' && r.value === profile.member_type
            );

            if (memberTypeOverride) {
              points = memberTypeOverride.points;
            } else {
              // Priority 2: Tier
              const tierOverride = mission.requirements.reward_overrides.find(
                r => r.type === 'tier' && r.value === profile.tier
              );
              if (tierOverride) {
                points = tierOverride.points;
              }
            }
          }

          return {
            ...mission,
            display_points: points
          };
        });

        setMissions(processedMissions);
      }

      // Fetch completions for this user
      const { data: completions } = await supabase
        .from('mission_completions')
        .select('mission_id, status')
        .eq('profile_id', profile.id);

      if (completions) {
        // Consider 'pending' or 'approved' as interacted/completed depending on logic
        // Usually for missions like Scan QR, if it exists in completion, it's done.
        setCompletedMissionIds(completions.map(c => c.mission_id));
      }
      setIsLoading(false);
    };

    fetchData();
  }, [profile]);

  return { missions, completedMissionIds, isLoading };
}

