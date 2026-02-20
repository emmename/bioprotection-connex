import { MapPin, QrCode, Star, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  mission_type: string;
  points_reward: number;
  coins_reward: number;
  start_date: string | null;
  end_date: string | null;
}

interface SpecialMissionsSectionProps {
  missions: Mission[];
  completedMissionIds: string[];
  isLoading: boolean;
}

function getMissionIcon(type: string) {
  switch (type) {
    case 'qr_scan': return QrCode;
    case 'location_visit': return MapPin;
    default: return Star;
  }
}

function getMissionTypeLabel(type: string) {
  switch (type) {
    case 'qr_scan': return 'สแกน QR';
    case 'location_visit': return 'เยี่ยมชมสถานที่';
    default: return 'ภารกิจพิเศษ';
  }
}

export function SpecialMissionsSection({ missions, completedMissionIds, isLoading }: SpecialMissionsSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🏆</span> ภารกิจพิเศษ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (missions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🏆</span> ภารกิจพิเศษ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">ยังไม่มีภารกิจพิเศษในขณะนี้</p>
            <p className="text-muted-foreground text-xs mt-1">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>🏆</span> ภารกิจพิเศษ
        </CardTitle>
        <p className="text-sm text-muted-foreground">ภารกิจพิเศษที่ให้รางวัลมากขึ้น</p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {missions.map((mission) => {
          const Icon = getMissionIcon(mission.mission_type);
          const isCompleted = completedMissionIds.includes(mission.id);
          const isExpired = mission.end_date && new Date(mission.end_date) < new Date();
          const hasDateRange = mission.start_date || mission.end_date;

          return (
            <div
              key={mission.id}
              className={`p-4 rounded-xl border transition-colors ${isCompleted
                  ? 'bg-green-50 border-green-200'
                  : isExpired
                    ? 'bg-muted/30 border-border opacity-60'
                    : 'bg-card border-border hover:border-primary/30'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-100' : 'bg-primary/10'
                  }`}>
                  <Icon className={`w-6 h-6 ${isCompleted ? 'text-green-600' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {mission.title}
                    </p>
                    {isCompleted && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  {mission.description && (
                    <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                      {getMissionTypeLabel(mission.mission_type)}
                    </Badge>
                    {mission.points_reward > 0 && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        +{mission.points_reward} ⭐
                      </Badge>
                    )}
                    {mission.coins_reward > 0 && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                        +{mission.coins_reward} 🪙
                      </Badge>
                    )}
                  </div>
                  {hasDateRange && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {mission.start_date && (
                        <span>{new Date(mission.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                      )}
                      {mission.start_date && mission.end_date && <span>-</span>}
                      {mission.end_date && (
                        <span>{new Date(mission.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                      {isExpired && <Badge variant="outline" className="text-[10px] ml-1">หมดเขต</Badge>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
