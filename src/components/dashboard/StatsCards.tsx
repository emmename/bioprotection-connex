import { Card } from '@/components/ui/card';
import coinIcon from '@/assets/new_icons/coin_10692946 (1).svg';
import fireIcon from '@/assets/new_icons/fire_785116.svg';
import bronzeTrophy from '@/assets/new_icons/bronze_trophy.svg';
import silverTrophy from '@/assets/new_icons/silver_trophy.svg';
import goldTrophy from '@/assets/new_icons/gold_trophy.svg';
import platinumTrophy from '@/assets/new_icons/platinum_trophy.svg';

interface StatsCardsProps {
  coins: number;
  tier: string;
  tierDisplayName?: string;
  streak: number;
}

const tierDisplayNames: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const tierIcons: Record<string, string> = {
  bronze: bronzeTrophy,
  silver: silverTrophy,
  gold: goldTrophy,
  platinum: platinumTrophy,
};

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  iconSrc: string;
  value: string | number;
  label: React.ReactNode;
  iconBgColor?: string;
  className?: string; // For border color
  gradientFrom?: string; // For background gradient
}

function StatCard({ iconSrc, value, label, iconBgColor = 'bg-primary/10', className = '', gradientFrom = 'from-primary', ...props }: StatCardProps) {
  return (
    <Card className={`p-4 flex flex-col items-center justify-center text-center gap-2.5 h-full border-l-[3px] sm:border-l-4 ${className} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden relative group cursor-default`} {...props}>
      <div className={`w-11 h-11 ${iconBgColor} rounded-full flex items-center justify-center shrink-0 z-10 transition-transform duration-300 group-hover:scale-110`}>
        <img src={iconSrc} alt={label as string} className="w-6 h-6 object-contain" />
      </div>
      <div className="w-full overflow-hidden z-10 flex flex-col items-center min-w-0">
        <p className={`font-bold tracking-tight w-full text-center ${typeof value === 'string' && value.length > 8 ? 'text-sm truncate px-1' : 'text-xl truncate'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <div className="text-xs text-muted-foreground leading-tight font-medium text-center">
          {label}
        </div>
      </div>
      {/* Subtle decorative gradient background */}
      <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br ${gradientFrom} to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.05]`} />
    </Card>
  );
}

import { ExchangeCoinsDialog } from './ExchangeCoinsDialog';

export function StatsCards({ coins, tier, tierDisplayName, streak }: StatsCardsProps) {
  const tierDisplay = tierDisplayName || tierDisplayNames[tier] || 'Bronze';
  const currentTierIcon = tierIcons[tier] || bronzeTrophy;

  return (
    <div className="grid grid-cols-3 gap-3">
      <ExchangeCoinsDialog
        currentCoins={coins}
        onExchangeSuccess={() => window.location.reload()}
        trigger={
          <div className="h-full"> {/* Wrapper div might be needed if DialogTrigger has issues with complex components, but StatCard spreads props so it should be fine directly if passed as a single child. DialogTrigger expects a single child. */}
            <StatCard
              iconSrc={coinIcon}
              value={coins}
              label={
                <>
                  เหรียญสะสม
                  <br />
                  <span className="text-[9px] opacity-90 font-normal">(กดเพื่อแลกคะแนน)</span>
                </>
              }
              iconBgColor="bg-amber-100"
              className="border-l-amber-400 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95"
              gradientFrom="from-amber-500"
            />
          </div>
        }
      />

      <StatCard
        iconSrc={currentTierIcon}
        value={tierDisplay}
        label="ระดับสมาชิก"
        iconBgColor="bg-blue-100"
        className="border-l-blue-400"
        gradientFrom="from-blue-500"
      />
      <StatCard
        iconSrc={fireIcon}
        value={streak}
        label="เช็คอินต่อเนื่อง"
        iconBgColor="bg-orange-100"
        className="border-l-orange-400"
        gradientFrom="from-orange-500"
      />
    </div>
  );
}
