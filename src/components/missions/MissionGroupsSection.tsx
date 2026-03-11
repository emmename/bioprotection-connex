import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Check, Clock, CheckCircle2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import missionChickIcon from '@/assets/buttons/mission_chick02_256.png';
import surveyIcon from '@/assets/buttons/survey_mumu01_256.png';
import locationIcon from '@/assets/buttons/scan_chick02_256.png';
import qrIcon from '@/assets/buttons/scan_pig01_256.png';
import specialIcon from '@/assets/buttons/mission_pig02_256.png';

interface Mission {
    id: string;
    title: string;
    description: string | null;
    mission_type: string;
    points_reward: number;
    display_points?: number;
    coins_reward: number;
    sequence_order: number;
    is_completed?: boolean;
    is_locked?: boolean;
    start_date: string | null;
    end_date: string | null;
    requirements?: {
        content_id?: string;
        [key: string]: unknown;
    } | null;
}

interface MissionGroup {
    id: string;
    title: string;
    description: string | null;
    grand_bonus_points: number;
    grand_bonus_coins: number;
    missions: Mission[];
    is_completed: boolean;
    current_step: number;
    total_steps: number;
}

interface MissionGroupsSectionProps {
    groups: MissionGroup[];
    isLoading: boolean;
}

function getMissionIcon(type: string) {
    switch (type) {
        case 'qr_scan': return qrIcon;
        case 'location_visit': return locationIcon;
        case 'survey': return surveyIcon;
        default: return specialIcon;
    }
}

export function MissionGroupsSection({ groups, isLoading }: MissionGroupsSectionProps) {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span>🗺️</span> ภารกิจต่อเนื่องแบบกลุ่ม
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    if (!groups || groups.length === 0) {
        return null; // Don't show the section if no groups are active
    }

    return (
        <div className="space-y-6">
            {groups.map(group => (
                <Card key={group.id} className={`overflow-hidden border-2 ${group.is_completed ? 'border-green-200' : 'border-primary/20'}`}>
                    <div className={`px-4 py-3 ${group.is_completed ? 'bg-green-50' : 'bg-primary/5'}`}>
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-lg">{group.title}</h3>
                            {group.is_completed ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> สำเร็จแล้ว
                                </Badge>
                            ) : (
                                <div className="flex gap-2 items-center">
                                    <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        ด่าน {Math.min(group.current_step, group.total_steps)}/{group.total_steps}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary" onClick={() => navigate(`/mission-groups/${group.id}`)}>
                                        ดูทั้งหมด
                                    </Button>
                                </div>
                            )}
                        </div>
                        {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                        )}
                    </div>

                    <CardContent className="p-0 border-t">
                        <div className="divide-y relative">
                            {/* Simple vertical pathway line */}
                            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border hidden sm:block"></div>

                            {group.missions.map((mission, idx) => {
                                const Icon = getMissionIcon(mission.mission_type);
                                const isCompleted = mission.is_completed;
                                const isLocked = mission.is_locked;
                                const isCurrent = !isCompleted && !isLocked;

                                return (
                                    <div
                                        key={mission.id}
                                        className={`p-4 sm:pl-16 relative transition-colors
                      ${isCompleted ? 'bg-secondary/10' : ''}
                      ${isCurrent ? 'bg-background hover:bg-muted/30 cursor-pointer' : ''}
                      ${isLocked ? 'bg-muted/20 opacity-70' : ''}
                    `}
                                        onClick={() => {
                                            navigate(`/mission-groups/${group.id}`);
                                        }}
                                    >
                                        {/* Node marker (desktop) */}
                                        <div className={`hidden sm:flex absolute left-[22px] top-1/2 -mt-4 w-8 h-8 rounded-full border-4 border-background items-center justify-center z-10
                      ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-primary shadow-[0_0_0_2px_rgba(var(--primary),0.2)]' : 'bg-muted-foreground/30'}
                    `}>
                                            {isCompleted ? <Check className="w-4 h-4 text-white" /> : <span className="text-xs font-bold text-white">{idx + 1}</span>}
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                                {isLocked ? (
                                                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                                        <Lock className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                ) : (
                                                    <img src={getMissionIcon(mission.mission_type)} alt="" className="w-full h-full object-contain" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                                        <span className="sm:hidden mr-1 text-primary">#{idx + 1}</span>
                                                        {mission.title}
                                                    </p>
                                                </div>

                                                {mission.description && !isLocked && (
                                                    <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {isCompleted && (
                                                        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 font-normal">
                                                            สำเร็จแล้ว
                                                        </Badge>
                                                    )}
                                                    {!isCompleted && !isLocked && (mission.display_points || mission.points_reward) > 0 && (
                                                        <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 font-normal">
                                                            +{(mission.display_points || mission.points_reward)} ⭐
                                                        </Badge>
                                                    )}
                                                    {!isCompleted && !isLocked && mission.coins_reward > 0 && (
                                                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 font-normal">
                                                            +{mission.coins_reward} 🪙
                                                        </Badge>
                                                    )}
                                                    {isLocked && (
                                                        <span className="text-xs text-muted-foreground">ทำภารกิจก่อนหน้าเพื่อปลดล็อก</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>

                    <CardFooter className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-t">
                        <div className="flex items-center gap-3 w-full cursor-pointer" onClick={() => navigate(`/mission-groups/${group.id}`)}>
                            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mb-1">
                                <img src={missionChickIcon} alt="Grand Bonus" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-amber-900">รางวัลใหญ่เมื่อทำครบทุกด่าน</p>
                                <div className="flex gap-2 mt-0.5">
                                    {group.grand_bonus_points > 0 && (
                                        <span className="text-xs font-semibold text-amber-700">+{group.grand_bonus_points} คะแนน ⭐</span>
                                    )}
                                    {group.grand_bonus_coins > 0 && (
                                        <span className="text-xs font-semibold text-orange-700">+{group.grand_bonus_coins} เหรียญ 🪙</span>
                                    )}
                                </div>
                            </div>
                            {group.is_completed && (
                                <Badge className="bg-amber-500 hover:bg-amber-600">รับแล้ว!</Badge>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
