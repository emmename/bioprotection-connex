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
  color?: string | null;
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
  livestock_shop: 'ร้านค้าสินค้าปศุสัตว์',
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
    <Card className="overflow-visible border-none shadow-none bg-transparent">
      <div className="gradient-primary p-6 text-white relative rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-1">
        {/* Mascot */}
        <div className="absolute -top-8 right-2 w-32 h-32 opacity-100 filter drop-shadow-xl pointer-events-none z-10 transition-transform duration-500 hover:scale-105">
          <img src={mascotChicken} alt="Mascot" className="w-full h-full object-contain" />
        </div>

        {/* Badge & Tier Name */}
        <div className="flex items-center gap-4 mb-5">
          <Link
            to="/profile"
            className={`w-16 h-16 ${!currentTier?.color ? tierColor : ''} rounded-full flex items-center justify-center shadow-md overflow-hidden border-[3px] border-white/40 active:scale-95 transition-all duration-300 hover:shadow-lg`}
            style={currentTier?.color ? { backgroundColor: currentTier.color } : {}}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </Link>
          <div className="space-y-0.5">
            <Badge
              variant="secondary"
              className={`text-white hover:opacity-90 mb-1 ${!currentTier?.color ? tierColor : ''}`}
              style={currentTier?.color ? { backgroundColor: currentTier.color } : {}}
            >
              {displayTierName.toUpperCase()}
            </Badge>
            <p className="text-2xl font-bold tracking-tight">{memberName}</p>
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
