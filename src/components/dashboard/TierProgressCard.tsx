import { Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TierSettings {
  tier: string;
  display_name: string;
  min_points: number;
  max_points: number | null;
  benefits: string[];
}

interface TierProgressCardProps {
  currentTier?: TierSettings;
  nextTier?: TierSettings;
  currentPoints: number;
}

export function TierProgressCard({ currentTier, nextTier, currentPoints }: TierProgressCardProps) {
  const getTierName = (tier: string, settings?: TierSettings) => {
    if (settings?.display_name) return settings.display_name;

    switch (tier) {
      case 'bronze': return 'Bronze';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      case 'platinum': return 'Platinum';
      default: return tier;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-[hsl(var(--tier-bronze))]';
      case 'silver': return 'text-[hsl(var(--tier-silver))]';
      case 'gold': return 'text-[hsl(var(--tier-gold))]';
      case 'platinum': return 'text-[hsl(var(--tier-platinum))]';
      default: return 'text-primary';
    }
  };

  const getTierGradientClass = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'gradient-tier-bronze';
      case 'silver': return 'gradient-tier-silver';
      case 'gold': return 'gradient-tier-gold';
      case 'platinum': return 'gradient-tier-platinum';
      default: return 'gradient-primary';
    }
  };

  // Calculate progress
  const minPoints = currentTier?.min_points || 0;
  const maxPoints = nextTier?.min_points || currentTier?.max_points || currentPoints;
  const progressPercent = nextTier
    ? Math.min(((currentPoints - minPoints) / (maxPoints - minPoints)) * 100, 100)
    : 100;
  const pointsToNext = nextTier ? Math.max(maxPoints - currentPoints, 0) : 0;

  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTierGradientClass(currentTier?.tier || 'bronze')}`}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ระดับสมาชิก</p>
              <p className={`font-bold ${getTierColor(currentTier?.tier || 'bronze')}`}>
                {getTierName(currentTier?.tier || 'bronze', currentTier)}
              </p>
            </div>
          </div>

          {nextTier && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>ถัดไป</span>
              <ChevronRight className="w-4 h-4" />
              <span className={`font-medium ${getTierColor(nextTier.tier)}`}>
                {getTierName(nextTier.tier, nextTier)}
              </span>
            </div>
          )}
        </div>

        {nextTier ? (
          <>
            <Progress value={progressPercent} className="h-3 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentPoints.toLocaleString()} คะแนน</span>
              <span>อีก {pointsToNext.toLocaleString()} คะแนน</span>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-accent font-medium">
              🎉 คุณอยู่ในระดับสูงสุดแล้ว!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
