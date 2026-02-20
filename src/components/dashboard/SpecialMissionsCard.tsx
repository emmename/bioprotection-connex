import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, Check, ScanLine, MapPin, Loader2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpecialMissions } from '@/hooks/useGamification';

export function SpecialMissionsCard() {
    const navigate = useNavigate();
    const { missions, completedMissionIds, isLoading } = useSpecialMissions();
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

                        // Determine action based on mission type (simple logic for now)
                        const handleAction = () => {
                            if (mission.mission_type === 'scan_qr' || mission.qr_code) {
                                navigate('/missions/scan');
                            } else {
                                navigate(`/missions/${mission.id}`);
                            }
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
                                    <div className={`p-2 rounded-lg ${isCompleted ? 'bg-slate-100' : 'bg-amber-100'}`}>
                                        {mission.mission_type === 'scan_qr' ? (
                                            <ScanLine className={`w-5 h-5 ${isCompleted ? 'text-slate-500' : 'text-amber-600'}`} />
                                        ) : (
                                            <MapPin className={`w-5 h-5 ${isCompleted ? 'text-slate-500' : 'text-amber-600'}`} />
                                        )}
                                    </div>
                                    <Badge variant={isCompleted ? "secondary" : "default"} className={isCompleted ? "" : "bg-amber-500 hover:bg-amber-600"}>
                                        +{mission.display_points} คะแนน
                                    </Badge>
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
                                    <Button size="sm" variant="outline" className="w-full gap-2 cursor-default bg-slate-50 text-green-600 border-green-200 hover:bg-slate-50 hover:text-green-600">
                                        <Check className="w-4 h-4" /> ทำสำเร็จแล้ว
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
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
