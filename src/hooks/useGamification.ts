import { useEffect, useState, useCallback } from 'react';
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

  return { tiers: tiers || [], isLoading, refetch: fetchTiers };
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

  const fetchCheckin = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('profile_id', profile?.id)
      .eq('checkin_date', today)
      .maybeSingle();

    if (data) {
      setTodayCheckin(data as DailyCheckin);
      setStreak(data.streak_count);
    }
    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      setIsLoading(false);
      return;
    }

    fetchCheckin();
  }, [profile, authLoading, fetchCheckin]);

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

  return { todayCheckin, streak, isLoading: authLoading || isLoading, checkin, refetch: fetchCheckin };
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

  const fetchProgress = useCallback(async () => {
    if (!profile) {
      if (!checkinLoading) setIsLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

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
  }, [profile, todayCheckin, checkinLoading]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { missionStatus, isLoading: isLoading || checkinLoading, refetch: fetchProgress };
}

export function useSpecialMissions() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<(Mission & { display_points: number })[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch active missions and any linked events
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
      const typedMissions = missionsData as unknown as Mission[];

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

    let completedIds: string[] = [];

    if (completions) {
      // Consider 'pending' or 'approved' as interacted/completed depending on logic
      // Usually for missions like Scan QR, if it exists in completion, it's done.
      completedIds = completions.map(c => c.mission_id);
    }

    // Check survey missions progress
    if (missionsData) {
      const surveyMissions = (missionsData as unknown as Mission[]).filter(m => m.mission_type === 'survey' || m.mission_type === 'special');
      if (surveyMissions.length > 0) {
        const contentIds = surveyMissions.map(m => (m.requirements as Record<string, any>)?.content_id).filter(Boolean) as string[];
        if (contentIds.length > 0) {
          const { data: contentCompletions } = await supabase
            .from('content_progress')
            .select('content_id')
            .eq('profile_id', profile.id)
            .eq('is_completed', true)
            .in('content_id', contentIds);

          if (contentCompletions) {
            const completedContentIds = contentCompletions.map(c => c.content_id);
            surveyMissions.forEach(m => {
              const cId = (m.requirements as Record<string, any>)?.content_id as string;
              if (cId && completedContentIds.includes(cId)) {
                if (!completedIds.includes(m.id)) {
                  completedIds.push(m.id);
                }
              }
            });
          }
        }
      }
    }

    setCompletedMissionIds(completedIds);
    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { missions, completedMissionIds, isLoading, refetch: fetchData };
}

export function useMissionGroups() {
  const { profile } = useAuth();
  const [missionGroups, setMissionGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch active mission groups
    const { data: groupsData, error: groupsError } = await supabase
      .from('mission_groups')
      .select(`
        *,
        missions (
          id, title, description, mission_type, points_reward, coins_reward, sequence_order, requirements, start_date, end_date
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching mission groups:', groupsError);
    }

    // Fetch user's completed individual missions to determine group progress
    const { data: completions } = await supabase
      .from('mission_completions')
      .select('mission_id')
      .eq('profile_id', profile.id);

    const completedMissionIds = completions?.map(c => c.mission_id) || [];

    // Check content progress for survey missions
    const allCompletedIds = [...completedMissionIds];
    if (groupsData) {
      const surveyContentIds: string[] = [];
      groupsData.forEach(g => {
        if (g.missions) {
          g.missions.forEach((m: any) => {
            if ((m.mission_type === 'survey' || m.mission_type === 'special') && m.requirements?.content_id) {
              surveyContentIds.push(m.requirements.content_id);
            }
          });
        }
      });

      if (surveyContentIds.length > 0) {
        const { data: contentComps } = await supabase
          .from('content_progress')
          .select('content_id')
          .eq('profile_id', profile.id)
          .eq('is_completed', true)
          .in('content_id', surveyContentIds);

        if (contentComps) {
          const completedContentIds = contentComps.map(c => c.content_id);
          groupsData.forEach(g => {
            if (g.missions) {
              g.missions.forEach((m: any) => {
                const cId = m.requirements?.content_id;
                if (cId && completedContentIds.includes(cId)) {
                  if (!allCompletedIds.includes(m.id)) {
                    allCompletedIds.push(m.id);
                  }
                }
              });
            }
          });
        }
      }
    }

    // Fetch user's completed groups
    const { data: userGroups } = await supabase
      .from('user_mission_groups')
      .select('group_id, is_completed')
      .eq('profile_id', profile.id);

    const completedGroupIds = userGroups?.filter(ug => ug.is_completed).map(ug => ug.group_id) || [];

    if (groupsData) {
      // Filter groups: the user must be eligible for EVERY mission within the group
      const eligibleGroups = groupsData.filter(group => {
        if (!group.missions || group.missions.length === 0) return false;

        return group.missions.every((mission: any) => {
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
        });
      });

      // Sort missions inside groups by sequence order
      const processedGroups = eligibleGroups.map(group => {
        const sortedMissions = (group.missions || []).sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0));

        let currentStep = 1; // 1-indexed step that user is currently on
        for (let i = 0; i < sortedMissions.length; i++) {
          if (allCompletedIds.includes(sortedMissions[i].id)) {
            currentStep = i + 2;
          } else {
            break;
          }
        }

        // Apply targeting and reward overrides for each mission
        const processedMissions = sortedMissions.map((mission: any, index: number) => {
          let points = mission.points_reward;

          if (mission.requirements?.reward_overrides) {
            const memberTypeOverride = mission.requirements.reward_overrides.find(
              (r: any) => r.type === 'member_type' && r.value === profile.member_type
            );
            if (memberTypeOverride) {
              points = memberTypeOverride.points;
            } else {
              const tierOverride = mission.requirements.reward_overrides.find(
                (r: any) => r.type === 'tier' && r.value === profile.tier
              );
              if (tierOverride) points = tierOverride.points;
            }
          }

          return {
            ...mission,
            display_points: points,
            is_completed: allCompletedIds.includes(mission.id),
            is_locked: currentStep <= index // Lock if it's beyond the current step
          };
        });

        return {
          ...group,
          missions: processedMissions,
          is_completed: completedGroupIds.includes(group.id) || currentStep > sortedMissions.length,
          current_step: currentStep,
          total_steps: sortedMissions.length
        };
      });

      setMissionGroups(processedGroups);
    }

    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { missionGroups, isLoading, refetch: fetchData };
}

export function useQRScan() {
  const { profile, refreshProfile } = useAuth();
  const [isScanning, setIsScanning] = useState(false);

  const scanQR = async (qrText: string) => {
    if (!profile) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
    
    setIsScanning(true);
    try {
      const { data, error } = await supabase.rpc('process_qr_scan', {
        p_qr_text: qrText,
        p_user_id: profile.id
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean, message?: string, points_awarded?: number, coins_awarded?: number };
      if (result?.success) {
        await refreshProfile();
      }
      
      return result;
    } catch (error: any) {
      console.error('QR Scan error:', error);
      return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ QR Code' };
    } finally {
      setIsScanning(false);
    }
  };

  return { scanQR, isScanning };
}
