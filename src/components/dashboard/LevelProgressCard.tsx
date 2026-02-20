import { User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import mascotChicken from '@/assets/mascot-chicken.png';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface TierSetting {
  tier: string;
  display_name: string;
  min_points: number;
  max_points: number | null;
  benefits: string[] | null;
}

interface LevelProgressCardProps {
  currentTier: TierSetting | undefined;
  nextTier: TierSetting | undefined;
  currentPoints: number;
  memberName?: string;
  memberType?: string;
  avatarUrl?: string | null;
  subTypeLabel?: string;
}

const memberTypeNames: Record<string, string> = {
  farm: 'ฟาร์มเลี้ยงสัตว์',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านค้าปศุสัตว์',
  government: 'หน่วยงานราชการ',
  other: 'อื่นๆ',
};

const tierColors: Record<string, string> = {
  bronze: 'bg-[hsl(var(--tier-bronze))]',
  silver: 'bg-[hsl(var(--tier-silver))]',
  gold: 'bg-[hsl(var(--tier-gold))]',
  platinum: 'bg-[hsl(var(--tier-platinum))]',
};

export function LevelProgressCard({ currentTier, nextTier, currentPoints, memberName, memberType, avatarUrl, subTypeLabel }: LevelProgressCardProps) {
  const tierName = currentTier?.tier || 'bronze';
  const displayTierName = currentTier?.display_name || 'Bronze';
  // Calculate occupation label: "MemberType (SubType)" or just "MemberType"
  const genericLabel = memberTypeNames[memberType || ''] || memberTypeNames.other;
  const occupationLabel = subTypeLabel && subTypeLabel !== genericLabel
    ? `${genericLabel} (${subTypeLabel})`
    : genericLabel;
  const tierColor = tierColors[tierName] || tierColors.bronze;

  // Calculate progress to next tier
  const minPoints = currentTier?.min_points || 0;
  const maxPoints = nextTier?.min_points || currentTier?.max_points || minPoints + 1000;
  const progressPoints = currentPoints - minPoints;
  const totalNeeded = maxPoints - minPoints;
  const progressPercent = Math.min((progressPoints / totalNeeded) * 100, 100);
  const pointsToNext = Math.max(maxPoints - currentPoints, 0);

  const isMaxTier = !nextTier;

  return (
    <Card className="overflow-hidden">
      <div className="gradient-primary p-5 text-white relative">
        {/* Mascot */}
        <div className="absolute top-4 right-2 w-24 h-24 opacity-90">
          <img src={mascotChicken} alt="Mascot" className="w-full h-full object-contain" />
        </div>

        {/* Badge & Tier Name */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/profile" className={`w-[58px] h-[58px] ${tierColor} rounded-full flex items-center justify-center shadow-lg overflow-hidden border-2 border-white/30`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7 text-white" />
            )}
          </Link>
          <div>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 mb-1">
              {displayTierName.toUpperCase()}
            </Badge>
            <p className="text-xl font-bold">{memberName}</p>
            <p className="text-xs text-white/70">{occupationLabel}</p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/90 font-medium">คะแนนสะสม</span>
            <span className="font-semibold">
              {currentPoints.toLocaleString()}/{maxPoints.toLocaleString()}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className="h-3 bg-black/30"
            indicatorClassName="bg-amber-400"
          />
          <p className="text-center text-sm mt-3">
            {isMaxTier ? (
              <span className="text-white/90">🎉 คุณอยู่ระดับสูงสุดแล้ว!</span>
            ) : (
              <span className="text-white/90">
                อีก <span className="font-bold">{pointsToNext.toLocaleString()}</span> คะแนน เพื่ออัปเลเวล 🚀
              </span>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
