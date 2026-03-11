import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, Check, Star, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpecialMissions } from '@/hooks/useGamification';

import surveyIcon from '@/assets/buttons/survey_mumu01_256.png';
import locationIcon from '@/assets/buttons/scan_chick02_256.png';
import qrIcon from '@/assets/buttons/scan_pig01_256.png';
import specialIcon from '@/assets/buttons/mission_pig02_256.png';

export function SpecialMissionsCard() {
    const navigate = useNavigate();
    const { missions: allMissions, completedMissionIds, isLoading } = useSpecialMissions();
    const missions = allMissions.filter(m => !m.group_id);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (isLoading) {
        return (
            <Card className="shadow-md animate-pulse">
                <CardHeader className="pb-3">
                    <div className="h-6 w-32 bg-slate-200 rounded" />
                </CardHeader>
                <CardContent>
                    <div className="h-24 bg-slate-100 rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    if (missions.length === 0) {
        return null;
    }

    return (
        <Card className="shadow-md border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> ภารกิจพิเศษ
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-900 hover:bg-amber-100" onClick={() => navigate('/missions')}>
                    ดูทั้งหมด <ChevronRight className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="pt-0">
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide snap-x"
                >
                    {missions.map((mission) => {
                        const isCompleted = completedMissionIds.includes(mission.id);

                        // Icon mapping
                        const getIcon = () => {
                            let iconSrc = specialIcon;
                            switch (mission.mission_type) {
                                case 'qr_scan':
                                case 'scan_qr':
                                    iconSrc = qrIcon;
                                    break;
                                case 'location_visit':
                                    iconSrc = locationIcon;
                                    break;
                                case 'survey':
                                    iconSrc = surveyIcon;
                                    break;
                                default:
                                    iconSrc = specialIcon;
                            }
                            return <img src={iconSrc} alt="" className="w-10 h-10 object-contain" />;
                        };

                        // Determine action based on mission type
                        const handleAction = () => {
                            if (mission.mission_type === 'qr_scan' || mission.mission_type === 'scan_qr') {
                                navigate('/missions/scanner');
                                return;
                            }
                            if (mission.mission_type === 'survey' || mission.mission_type === 'special') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const req = mission.requirements as Record<string, any>;
                                if (req && req.content_id) {
                                    navigate(`/content/${req.content_id}`);
                                    return;
                                } else if (mission.mission_type === 'survey') {
                                    console.error('Survey mission missing content_id in requirements', mission);
                                    window.alert('ไม่พบข้อมูลแบบสำรวจ กรุณาแจ้งผู้ดูแลระบบให้เข้าไปกดบันทึกภารกิจนี้ใหม่อีกครั้ง');
                                    return;
                                }
                            }
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const missionAny = mission as Record<string, any>;
                            if (missionAny.events && missionAny.events.length > 0) {
                                navigate('/events');
                                return;
                            }
                            navigate('/missions');
                        };

                        return (
                            <div
                                key={mission.id}
                                className={`flex-shrink-0 w-72 rounded-xl p-4 border snap-center transition-all ${isCompleted
                                    ? 'bg-slate-50 border-slate-200 opacity-80'
                                    : 'bg-white border-amber-200 shadow-sm hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-shrink-0">
                                        {getIcon()}
                                    </div>
                                    <div className="flex gap-1.5 flex-col items-end">
                                        <Badge variant="outline" className={`text-[10px] ${mission.mission_type === 'qr_scan' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                            mission.mission_type === 'location_visit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                mission.mission_type === 'survey' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    mission.mission_type === 'special' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        'bg-primary/10 text-primary border-primary/20'
                                            }`}>
                                            {mission.mission_type === 'survey' ? 'ทำแบบสำรวจ' :
                                                mission.mission_type === 'location_visit' ? 'Check-in' :
                                                    mission.mission_type === 'qr_scan' ? 'สแกน QR' : 'ภารกิจพิเศษ'}
                                        </Badge>
                                        <Badge variant={isCompleted ? "secondary" : "default"} className={isCompleted ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-500 hover:bg-amber-600"}>
                                            {isCompleted ? (
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> สำเร็จแล้ว
                                                </span>
                                            ) : (
                                                `+${mission.display_points} คะแนน`
                                            )}
                                        </Badge>
                                    </div>
                                </div>

                                <h3 className={`font-semibold mb-1 line-clamp-1 ${isCompleted ? 'text-slate-600' : 'text-amber-950'}`}>
                                    {mission.title}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mb-3">
                                    {mission.description || 'ทำภารกิจนี้เพื่อรับรางวัลพิเศษ'}
                                </p>

                                {mission.end_date && !isCompleted && (
                                    <div className="flex items-center gap-1 text-xs text-orange-600 mb-3 bg-orange-50 px-2 py-1 rounded w-fit">
                                        <Calendar className="w-3 h-3" />
                                        หมดเขต {new Date(mission.end_date).toLocaleDateString('th-TH')}
                                    </div>
                                )}
                                {isCompleted ? (
                                    <Button size="sm" variant="outline" className="w-full gap-2 cursor-default bg-slate-50 text-green-600 border-green-200 hover:bg-slate-50 hover:text-green-600 transition-all duration-300">
                                        <Check className="w-4 h-4" /> ทำสำเร็จแล้ว
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md active:scale-95 transition-all duration-300"
                                        onClick={handleAction}
                                    >
                                        เริ่มทำภารกิจ
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
