import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyCheckin, useDailyMissions, useSpecialMissions } from '@/hooks/useGamification';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { DailyMissionsSection } from '@/components/missions/DailyMissionsSection';
import { SpecialMissionsSection } from '@/components/missions/SpecialMissionsSection';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';

export default function Missions() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { todayCheckin, checkin, isLoading: checkinLoading } = useDailyCheckin();
  const { missionStatus, isLoading: dailyMissionsLoading } = useDailyMissions();
  const { missions: specialMissions, completedMissionIds, isLoading: specialMissionsLoading } = useSpecialMissions();

  if (authLoading || dailyMissionsLoading || specialMissionsLoading) {
    return <DashboardSkeleton />;
  }

  // Profile check moved to ProtectedRoute, but for type safety:
  if (!profile) return null;

  const dailyCompleted = [
    todayCheckin,
    missionStatus.receipt,
    missionStatus.article,
    missionStatus.video,
    missionStatus.quiz
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="ภารกิจทั้งหมด" />

      {/* Daily Progress Summary */}
      <div className="bg-primary text-primary-foreground px-4 pb-6 pt-2">
        <div className="container mx-auto max-w-lg">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-sm opacity-80">ภารกิจประจำวันที่ทำเสร็จ</p>
            <p className="text-3xl font-bold mt-1">{dailyCompleted}/5</p>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${i < dailyCompleted ? 'bg-white' : 'bg-white/20'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-lg px-4 py-4 space-y-6">
        <DailyMissionsSection
          todayCheckin={!!todayCheckin}
          onCheckin={checkin}
          isLoading={checkinLoading}
          receiptUploadedToday={missionStatus.receipt}
          articleReadToday={missionStatus.article}
          videoWatchedToday={missionStatus.video}
          quizCompletedToday={missionStatus.quiz}
        />

        <SpecialMissionsSection
          missions={specialMissions}
          completedMissionIds={completedMissionIds}
          isLoading={specialMissionsLoading}
        />
      </main>


    </div>
  );
}
