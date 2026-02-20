import { Star, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ExchangeCoinsDialog } from './ExchangeCoinsDialog';

interface PointsCoinsCardProps {
  points: number;
  coins: number;
  tier: string;
}

export function PointsCoinsCard({ points, coins, tier }: PointsCoinsCardProps) {
  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'gradient-tier-bronze';
      case 'silver': return 'gradient-tier-silver';
      case 'gold': return 'gradient-tier-gold';
      case 'platinum': return 'gradient-tier-platinum';
      default: return 'gradient-primary';
    }
  };

  return (
    <Card className="overflow-hidden card-hover">
      <CardContent className="p-0">
        <div className="grid grid-cols-2">
          {/* Points Section */}
          <div className={`${getTierGradient(tier)} p-5 text-white`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-white/80">คะแนนสะสม</span>
            </div>
            <p className="text-3xl font-bold animate-bounce-in">
              {points.toLocaleString()}
            </p>
            <p className="text-xs text-white/70 mt-1">Points</p>
          </div>

          {/* Coins Section */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-white/80">เหรียญ</span>
              </div>
              <ExchangeCoinsDialog
                currentCoins={coins}
                onExchangeSuccess={() => window.location.reload()}
                trigger={
                  <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-white transition-colors">
                    แลกคะแนน
                  </button>
                }
              />
            </div>
            <p className="text-3xl font-bold animate-bounce-in">
              {coins.toLocaleString()}
            </p>
            <p className="text-xs text-white/70 mt-1">Coins</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
