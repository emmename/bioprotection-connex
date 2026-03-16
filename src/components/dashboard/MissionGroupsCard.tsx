import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Check, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMissionGroups } from '@/hooks/useGamification';
import missionChickIcon from '@/assets/buttons/mission_chick02_256.png';

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
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <span>🗺️</span> ภารกิจต่อเนื่อง
                </CardTitle>
                <p className="text-sm text-muted-foreground">ทำภารกิจย่อยให้ครบทุกด่านเพื่อรับรางวัลใหญ่</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {missionGroups.map((group) => {
                    const isGroupCompleted = group.is_completed;
                    const currentStep = group.current_step;

                    const missions = group.missions || [];
                    const totalSteps = group.total_steps || missions.length;

                    return (
                        <div key={group.id} className="rounded-xl border bg-card p-4 transition-all hover:border-primary/30">
                            <div className="flex flex-col gap-1 pb-3 mb-4 border-b border-border/50">
                                <div className="flex items-center gap-2 text-primary font-semibold text-base">
                                    {group.title}
                                </div>
                                <span className="text-xs font-normal text-muted-foreground">
                                    {group.description || 'ทำภารกิจให้ครบเพื่อรับรางวัลใหญ่'}
                                </span>
                            </div>

                            <div className="relative w-full overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
                                <div className="relative min-w-[280px]">
                                    {/* Progress Line Background */}
                                    <div
                                        className="absolute h-[6px] bg-secondary rounded-full z-0 pointer-events-none"
                                        style={{
                                            top: '2.4rem',
                                            left: `calc(100% / (${totalSteps} * 2))`,
                                            width: `calc(100% * (${totalSteps} - 1) / ${totalSteps})`
                                        }}
                                    />

                                    {/* Active Progress Line */}
                                    <div
                                        className="absolute h-[6px] bg-blue-500 rounded-full z-0 transition-all duration-700 ease-out pointer-events-none"
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
                                                          w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95
                                                          ${(isLastStep && status !== 'upcoming') ? '' : 'border-2 bg-white shadow-sm'}
                                                          ${status === 'completed' && !isLastStep ? 'border-green-500 text-green-500 shadow-green-200' : ''}
                                                          ${status === 'current' ? (isLastStep ? 'ring-4 ring-primary/10 scale-110' : 'border-primary text-primary ring-4 ring-primary/10 scale-110') : ''}
                                                          ${status === 'upcoming' ? 'border-slate-200 text-slate-300' : ''}
                                                        `}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/mission-groups/${group.id}`)
                                                        }}
                                                    >
                                                        {status === 'completed' ? (
                                                            isLastStep ? <img src={missionChickIcon} alt="Grand Bonus" className="w-full h-full object-contain" /> : <Check className="w-5 h-5" />
                                                        ) : status === 'upcoming' ? (
                                                            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                                                        ) : isLastStep ? (
                                                            <img src={missionChickIcon} alt="Grand Bonus" className="w-full h-full object-contain" />
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
                                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 gap-3">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                            <img src={missionChickIcon} alt="Grand Bonus" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-amber-900">รางวัลใหญ่เมื่อผ่านทุกด่าน</span>
                                            <div className="flex flex-wrap gap-2.5 mt-0.5">
                                                {group.grand_bonus_points > 0 && <span className="text-xs font-bold text-amber-700">+{group.grand_bonus_points} ⭐</span>}
                                                {group.grand_bonus_coins > 0 && <span className="text-xs font-bold text-orange-700">+{group.grand_bonus_coins} 🪙</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className={`w-full sm:w-auto ${isGroupCompleted ? "bg-green-500 hover:bg-green-600 text-white transition-all duration-300" : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95 transition-all duration-300"}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/mission-groups/${group.id}`)
                                        }}
                                    >
                                        {isGroupCompleted ? "สำเร็จแล้ว" : "ทำภารกิจเลย!"}
                                    </Button>
                                </div>
                            )}

                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
