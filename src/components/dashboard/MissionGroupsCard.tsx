import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Check, Gift, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMissionGroups } from '@/hooks/useGamification';

export function MissionGroupsCard() {
    const navigate = useNavigate();
    const { missionGroups, isLoading } = useMissionGroups();

    if (isLoading) {
        return (
            <div className="space-y-4 mt-4">
                <Card className="shadow-md animate-pulse">
                    <CardHeader className="pb-3">
                        <div className="h-6 w-32 bg-slate-200 rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-24 bg-slate-100 rounded-xl" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!missionGroups || missionGroups.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mt-4">
            {missionGroups.map((group) => {
                const isGroupCompleted = group.is_completed;
                const currentStep = group.current_step;

                const missions = group.missions || [];
                const totalSteps = group.total_steps || missions.length;

                return (
                    <Card key={group.id} className="card-hover shadow-md border-primary/20">
                        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-lg flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-primary">
                                    <span className="text-xl">🗺️</span> {group.title}
                                </div>
                                <span className="text-xs font-normal text-muted-foreground mt-1">
                                    {group.description || 'ทำภารกิจให้ครบเพื่อรับรางวัลใหญ่'}
                                </span>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <div className="relative w-full overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
                                <div className="relative min-w-[280px]">
                                    {/* Progress Line Background */}
                                    <div
                                        className="absolute h-[6px] bg-slate-200 rounded-full z-0"
                                        style={{
                                            top: '2.4rem',
                                            left: `calc(100% / (${totalSteps} * 2))`,
                                            width: `calc(100% * (${totalSteps} - 1) / ${totalSteps})`
                                        }}
                                    />

                                    {/* Active Progress Line */}
                                    <div
                                        className="absolute h-[6px] bg-blue-500 rounded-full z-0 transition-all duration-500"
                                        style={{
                                            top: '2.4rem',
                                            left: `calc(100% / (${totalSteps} * 2))`,
                                            width: isGroupCompleted
                                                ? `calc(100% * (${totalSteps} - 1) / ${totalSteps})`
                                                : `calc(100% * (${Math.max(0, currentStep - 1)}) / ${totalSteps})`
                                        }}
                                    />

                                    <div className={`grid gap-0 relative`} style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
                                        {missions.map((mission: any, idx: number) => {
                                            const stepNum = idx + 1;

                                            let status = 'upcoming';
                                            if (mission.is_completed) {
                                                status = 'completed';
                                            } else if (!mission.is_locked) {
                                                status = 'current';
                                            }

                                            const isLastStep = stepNum === totalSteps;

                                            return (
                                                <div key={mission.id} className="flex flex-col items-center gap-2 relative">
                                                    <div className="text-[10px] text-muted-foreground font-medium">ด่าน {stepNum}</div>

                                                    <div
                                                        className={`
                                                          w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all shadow-sm bg-white cursor-pointer
                                                          ${status === 'completed' ? 'border-green-500 text-green-500 shadow-green-200' : ''}
                                                          ${status === 'current' ? 'border-primary text-primary ring-4 ring-primary/10 scale-110' : ''}
                                                          ${status === 'upcoming' ? 'border-slate-200 text-slate-300' : ''}
                                                        `}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/mission-groups/${group.id}`)
                                                        }}
                                                    >
                                                        {status === 'completed' ? (
                                                            <Check className="w-5 h-5" />
                                                        ) : status === 'upcoming' ? (
                                                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                                                        ) : isLastStep ? (
                                                            <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                                                        ) : (
                                                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        )}
                                                    </div>

                                                    {/* Rewards */}
                                                    <div className="flex flex-col items-center mt-1">
                                                        {(mission.display_points > 0 || mission.points_reward > 0) && (
                                                            <div className={`text-[10px] font-bold ${status === 'completed' || status === 'current' ? 'text-blue-600' : 'text-slate-300'}`}>
                                                                +{(mission.display_points || mission.points_reward)}⭐
                                                            </div>
                                                        )}
                                                        {mission.coins_reward > 0 && (
                                                            <div className={`text-[10px] font-bold ${status === 'completed' || status === 'current' ? 'text-amber-600' : 'text-slate-300'}`}>
                                                                +{mission.coins_reward}🪙
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Grand Bonus Section */}
                            {(group.grand_bonus_points > 0 || group.grand_bonus_coins > 0) && (
                                <div className="mt-4 flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                                            <Gift className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-amber-900">รางวัลใหญ่เมื่อผ่านทุกด่าน</span>
                                            <div className="flex gap-2.5 mt-0.5">
                                                {group.grand_bonus_points > 0 && <span className="text-xs font-bold text-amber-700">+{group.grand_bonus_points} ⭐</span>}
                                                {group.grand_bonus_coins > 0 && <span className="text-xs font-bold text-orange-700">+{group.grand_bonus_coins} 🪙</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className={isGroupCompleted ? "bg-green-500 hover:bg-green-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/mission-groups/${group.id}`)
                                        }}
                                    >
                                        {isGroupCompleted ? "สำเร็จแล้ว" : "ทำภารกิจเลย!"}
                                    </Button>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
