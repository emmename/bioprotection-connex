import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Check, Clock, Trophy, Download } from 'lucide-react';

interface MissionGroupParticipantsDialogProps {
    group: {
        id: string;
        title: string;
        missions?: { id: string; title: string; sequence_order: number | null }[];
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ParticipantProgress {
    profileId: string;
    firstName: string;
    lastName: string;
    memberId: string | null;
    completedMissions: {
        missionId: string;
        missionTitle: string;
        status: string;
        completedAt: string;
    }[];
    totalMissions: number;
    completedCount: number;
    isGroupComplete: boolean;
}

export function MissionGroupParticipantsDialog({ group, open, onOpenChange }: MissionGroupParticipantsDialogProps) {
    const [participants, setParticipants] = useState<ParticipantProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchParticipants = useCallback(async () => {
        setIsLoading(true);
        try {
            const missionIds = (group.missions || []).map(m => m.id);
            if (missionIds.length === 0) {
                setParticipants([]);
                return;
            }

            // Fetch all completions for missions in this group
            const { data: completions, error } = await supabase
                .from('mission_completions')
                .select('*, profile:profiles(first_name, last_name, member_id)')
                .in('mission_id', missionIds)
                .order('completed_at', { ascending: true });

            if (error) throw error;

            // Group by profile_id
            const profileMap = new Map<string, ParticipantProgress>();

            for (const c of (completions || [])) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profile = c.profile as Record<string, any> | null;
                if (!profile) continue;

                if (!profileMap.has(c.profile_id)) {
                    profileMap.set(c.profile_id, {
                        profileId: c.profile_id,
                        firstName: profile.first_name || '',
                        lastName: profile.last_name || '',
                        memberId: profile.member_id || null,
                        completedMissions: [],
                        totalMissions: missionIds.length,
                        completedCount: 0,
                        isGroupComplete: false,
                    });
                }

                const participant = profileMap.get(c.profile_id)!;
                const mission = group.missions?.find(m => m.id === c.mission_id);

                participant.completedMissions.push({
                    missionId: c.mission_id,
                    missionTitle: mission?.title || 'ไม่ทราบชื่อ',
                    status: c.status,
                    completedAt: c.completed_at,
                });
            }

            // Calculate completed count (only approved)
            for (const p of profileMap.values()) {
                const approvedMissionIds = new Set(
                    p.completedMissions
                        .filter(cm => cm.status === 'approved')
                        .map(cm => cm.missionId)
                );
                p.completedCount = approvedMissionIds.size;
                p.isGroupComplete = p.completedCount >= p.totalMissions;
            }

            // Sort: completed first, then by progress descending
            const sorted = Array.from(profileMap.values()).sort((a, b) => {
                if (a.isGroupComplete !== b.isGroupComplete) return a.isGroupComplete ? -1 : 1;
                return b.completedCount - a.completedCount;
            });

            setParticipants(sorted);
        } catch (error) {
            console.error('Error fetching participants:', error);
        } finally {
            setIsLoading(false);
        }
    }, [group.id, group.missions]);

    useEffect(() => {
        if (open) fetchParticipants();
    }, [open, fetchParticipants]);

    const totalMissions = group.missions?.length || 0;
    const completedAll = participants.filter(p => p.isGroupComplete).length;
    const inProgress = participants.filter(p => !p.isGroupComplete).length;

    const exportGroupCsv = () => {
        const missions = group.missions || [];
        const headers = ['ชื่อ-นามสกุล', 'รหัสสมาชิก', 'ความคืบหน้า', ...missions.map((m, i) => `ด่าน ${i + 1}: ${m.title}`), 'สถานะรวม'];
        const rows = participants.map(p => {
            const missionCols = missions.map(m => {
                const c = p.completedMissions.find(cm => cm.missionId === m.id && cm.status === 'approved');
                return c ? `ผ่าน (${format(new Date(c.completedAt), 'd MMM yy HH:mm', { locale: th })})` : 'ยังไม่ผ่าน';
            });
            return [
                `${p.firstName} ${p.lastName}`,
                p.memberId || '-',
                `${p.completedCount}/${totalMissions}`,
                ...missionCols,
                p.isGroupComplete ? 'ครบทุกด่าน' : 'กำลังทำ',
            ];
        });
        const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `กลุ่มภารกิจ_${group.title.replace(/[^a-zA-Z0-9ก-๙]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            ผู้เข้าร่วมภารกิจต่อเนื่อง: {group.title}
                        </DialogTitle>
                        {participants.length > 0 && (
                            <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => exportGroupCsv()}>
                                <Download className="h-4 w-4" />Export CSV
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{participants.length}</p>
                        <p className="text-xs text-muted-foreground">ผู้เข้าร่วมทั้งหมด</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{completedAll}</p>
                        <p className="text-xs text-muted-foreground">ผ่านครบทุกด่าน</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{inProgress}</p>
                        <p className="text-xs text-muted-foreground">กำลังดำเนินการ</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                ) : participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">ยังไม่มีผู้เข้าร่วมภารกิจนี้</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>สมาชิก</TableHead>
                                <TableHead>รหัสสมาชิก</TableHead>
                                <TableHead>ความคืบหน้า</TableHead>
                                <TableHead>ด่านที่ผ่าน</TableHead>
                                <TableHead>สถานะ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.map(p => (
                                <TableRow key={p.profileId}>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {p.firstName} {p.lastName}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {p.memberId || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 min-w-[120px]">
                                            <Progress
                                                value={totalMissions > 0 ? (p.completedCount / totalMissions) * 100 : 0}
                                                className="h-2 flex-1"
                                            />
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {p.completedCount}/{totalMissions}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {(group.missions || []).map((m, idx) => {
                                                const completion = p.completedMissions.find(cm => cm.missionId === m.id && cm.status === 'approved');
                                                return (
                                                    <span
                                                        key={m.id}
                                                        title={`ด่าน ${idx + 1}: ${m.title}${completion ? ` (${format(new Date(completion.completedAt), 'd MMM yy HH:mm', { locale: th })})` : ''}`}
                                                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border ${
                                                            completion
                                                                ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700'
                                                                : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        {completion ? <Check className="h-3 w-3" /> : idx + 1}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {p.isGroupComplete ? (
                                            <Badge className="bg-green-600 text-white">
                                                <Trophy className="h-3 w-3 mr-1" />ครบทุกด่าน
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <Clock className="h-3 w-3 mr-1" />กำลังทำ
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}
