import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Check, Lock, Star, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { useMissionGroups } from '@/hooks/useGamification';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import missionChickIcon from '@/assets/buttons/mission_chick02_256.png';

export default function MissionGroupDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { missionGroups, isLoading } = useMissionGroups();
    const [group, setGroup] = useState<any>(null);

    useEffect(() => {
        if (missionGroups && missionGroups.length > 0) {
            const found = missionGroups.find(g => g.id === id);
            setGroup(found);
        }
    }, [id, missionGroups]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (!group && !isLoading) {
        return (
            <div className="min-h-screen bg-background pb-24">
                <PageHeader title="กลุ่มภารกิจต่อเนื่อง" onBack={() => navigate(-1)} />
                <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
                    <p>ไม่พบกลุ่มภารกิจที่คุณต้องการ</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/missions')}>
                        กลับไปหน้าภารกิจ
                    </Button>
                </div>
            </div>
        );
    }

    const isCompleted = group?.is_completed;
    const currentStep = group?.current_step || 1;
    const missions = group?.missions || [];
    const totalSteps = group?.total_steps || missions.length;

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
                <div className="container mx-auto max-w-lg px-4 h-14 flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="font-semibold text-base truncate flex-1">
                        {group?.title || 'กลุ่มภารกิจ'}
                    </h1>
                </div>
            </div>

            <main className="container pt-6 mx-auto max-w-lg px-4 space-y-6">
                {/* Header section with Grand Bonus */}
                <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white overflow-hidden shadow-sm">
                    <div className="p-5 flex flex-col items-center text-center pb-6">
                        <div className="w-20 h-20 mb-2 rotation-pulse">
                            <img src={missionChickIcon} alt="Grand Bonus" className="w-full h-full object-contain" />
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none px-3 py-1 text-xs font-semibold mb-2">
                            รางวัลใหญ่ (Grand Bonus)
                        </Badge>
                        <h2 className="text-xl font-bold text-amber-950 px-2 leading-tight">
                            ทำให้สำเร็จครบทุกด่านเพื่อรับคะแนนและเหรียญพิเศษ!
                        </h2>
                        {group?.description && (
                            <p className="text-sm text-amber-900/70 mt-3 max-w-[90%] mx-auto">
                                {group.description}
                            </p>
                        )}

                        <div className="flex gap-3 justify-center mt-5 bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-white/40 shadow-inner">
                            {group?.grand_bonus_points > 0 && (
                                <div className="flex flex-col items-center px-4">
                                    <span className="text-xs font-medium text-slate-500 mb-0.5">รับคะแนนพิเศษ</span>
                                    <span className="text-lg font-black text-amber-600">+{group.grand_bonus_points} ⭐</span>
                                </div>
                            )}
                            {group?.grand_bonus_points > 0 && group?.grand_bonus_coins > 0 && (
                                <div className="w-[1px] bg-amber-200 self-stretch my-1" />
                            )}
                            {group?.grand_bonus_coins > 0 && (
                                <div className="flex flex-col items-center px-4">
                                    <span className="text-xs font-medium text-slate-500 mb-0.5">รับเหรียญพิเศษ</span>
                                    <span className="text-lg font-black text-orange-600">+{group.grand_bonus_coins} 🪙</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar inside Header */}
                    <div className="bg-white p-4 border-t border-amber-100">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-xs font-bold text-amber-900 tracking-wide uppercase">ความคืบหน้า</span>
                            </div>
                            <Badge variant={isCompleted ? "secondary" : "default"} className={isCompleted ? "bg-green-100 text-green-700 border-none" : "bg-primary text-white"}>
                                {isCompleted ? 'สำเร็จแล้ว' : `ด่าน ${Math.min(currentStep, totalSteps)}/${totalSteps}`}
                            </Badge>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${isCompleted ? 100 : (Math.max(0, currentStep - 1) / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Missions List / Roadmap */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4 px-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        เส้นทางภารกิจ
                    </h3>

                    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {missions.map((mission: any, idx: number) => {
                            const stepNum = idx + 1;
                            const isMissionCompleted = mission.is_completed;
                            const isMissionLocked = mission.is_locked;
                            const isMissionCurrent = !isMissionCompleted && !isMissionLocked;

                            return (
                                <div key={mission.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    {/* Line / Bubble connection */}
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-white shrink-0 z-10 shadow-sm
                          ml-0 md:mx-auto transition-transform
                          "
                                        style={{
                                            borderColor: isMissionCompleted ? '#dcfce7' : isMissionCurrent ? '#e0f2fe' : '#f8fafc'
                                        }}
                                    >
                                        <div className={`w-full h-full rounded-full flex items-center justify-center text-xs font-bold transition-colors
                             ${isMissionCompleted ? 'bg-green-500 text-white' :
                                                isMissionCurrent ? 'bg-primary text-white ring-4 ring-primary/20 scale-110' :
                                                    'bg-slate-100 text-slate-400'}`}
                                        >
                                            {isMissionCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                                        </div>
                                    </div>

                                    {/* Mission Card */}
                                    <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm border transition-all
                          ${isMissionCompleted ? 'bg-white border-green-100 opacity-80' :
                                            isMissionCurrent ? 'bg-white border-primary shadow-md hover:shadow-lg translate-x-1 cursor-pointer' :
                                                'bg-slate-50/50 border-slate-100 opacity-60'}`}
                                        onClick={() => {
                                            if (isMissionCurrent) {
                                                if ((mission.mission_type === 'survey' || mission.mission_type === 'special') && mission.requirements?.content_id) {
                                                    navigate(`/content/${mission.requirements.content_id}`);
                                                } else if (mission.mission_type === 'location_visit' || mission.events?.length > 0) {
                                                    navigate(`/events`);
                                                }
                                            }
                                        }}
                                    >
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className={`font-semibold text-sm line-clamp-2 ${isMissionLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                                                    {mission.title}
                                                </h4>
                                                {isMissionLocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />}
                                            </div>

                                            {!(isMissionCompleted || isMissionLocked) && mission.description && (
                                                <p className="text-xs text-slate-500 line-clamp-2">{mission.description}</p>
                                            )}

                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {!isMissionCompleted && !isMissionLocked && (
                                                    <>
                                                        {(mission.display_points || mission.points_reward) > 0 && (
                                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 font-medium">
                                                                +{(mission.display_points || mission.points_reward)} ⭐
                                                            </Badge>
                                                        )}
                                                        {mission.coins_reward > 0 && (
                                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 font-medium">
                                                                +{mission.coins_reward} 🪙
                                                            </Badge>
                                                        )}
                                                    </>
                                                )}
                                                {isMissionCompleted && (
                                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-50 text-green-600 border-green-200">
                                                        ผ่านแล้ว
                                                    </Badge>
                                                )}
                                            </div>

                                            {isMissionCurrent && (
                                                <div className="mt-3 flex items-center text-[10px] font-bold text-primary uppercase tracking-wider gap-1">
                                                    เริ่มทำภารกิจ <ChevronRight className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>
        </div>
    );
}
