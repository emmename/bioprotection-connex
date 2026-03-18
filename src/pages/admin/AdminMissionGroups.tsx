import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, ListOrdered, X, Eye, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { MissionGroupParticipantsDialog } from '@/components/admin/MissionGroupParticipantsDialog';

interface MissionGroup {
    id: string;
    title: string;
    description: string | null;
    grand_bonus_points: number;
    grand_bonus_coins: number;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    missions?: any[]; // We'll populate this with joined missions
}

interface Mission {
    id: string;
    title: string;
    group_id: string | null;
    sequence_order: number | null;
}

export default function AdminMissionGroups() {
    const [groups, setGroups] = useState<MissionGroup[]>([]);
    const [allMissions, setAllMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<MissionGroup | null>(null);
    const [viewingParticipantsGroup, setViewingParticipantsGroup] = useState<MissionGroup | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        grand_bonus_points: 0,
        grand_bonus_coins: 0,
        is_active: true,
        start_date: '',
        end_date: '',
    });

    // State to manage missions inside the currently editing group
    const [groupMissions, setGroupMissions] = useState<Mission[]>([]);
    const [availableMissionSearch, setAvailableMissionSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch groups
            const { data: groupsData, error: groupsError } = await supabase
                .from('mission_groups')
                .select('*')
                .order('created_at', { ascending: false });

            if (groupsError) throw groupsError;

            // Fetch all missions
            const { data: missionsData, error: missionsError } = await supabase
                .from('missions')
                .select('id, title, group_id, sequence_order')
                .order('sequence_order', { ascending: true });

            if (missionsError) throw missionsError;

            // Attach missions to their respective groups
            const typedMissions = (missionsData || []) as Mission[];
            const typedGroups = (groupsData || []).map(group => ({
                ...group,
                missions: typedMissions.filter(m => m.group_id === group.id).sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
            })) as MissionGroup[];

            setGroups(typedGroups);
            setAllMissions(typedMissions);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            grand_bonus_points: 0,
            grand_bonus_coins: 0,
            is_active: true,
            start_date: '',
            end_date: '',
        });
        setGroupMissions([]);
        setEditingGroup(null);
    };

    const openEditDialog = (group: MissionGroup) => {
        setEditingGroup(group);
        setFormData({
            title: group.title,
            description: group.description || '',
            grand_bonus_points: group.grand_bonus_points,
            grand_bonus_coins: group.grand_bonus_coins,
            is_active: group.is_active,
            start_date: group.start_date ? group.start_date.slice(0, 16) : '',
            end_date: group.end_date ? group.end_date.slice(0, 16) : '',
        });
        setGroupMissions(group.missions || []);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('กรุณากรอกชื่อกลุ่มภารกิจ');
            return;
        }

        try {
            const payload = {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                grand_bonus_points: formData.grand_bonus_points,
                grand_bonus_coins: formData.grand_bonus_coins,
                is_active: formData.is_active,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
            };

            let groupId = editingGroup?.id;

            if (editingGroup) {
                const { error } = await supabase.from('mission_groups').update(payload).eq('id', editingGroup.id);
                if (error) throw error;
                toast.success('อัปเดตกลุ่มภารกิจเรียบร้อย');
            } else {
                const { data, error } = await supabase.from('mission_groups').insert([payload]).select().single();
                if (error) throw error;
                groupId = data.id;
                toast.success('สร้างกลุ่มภารกิจเรียบร้อย');
            }

            // Update mission assignments & sequence_order
            if (groupId) {
                // First, unlink missions that were removed from the group
                const originalMissionIds = editingGroup?.missions?.map(m => m.id) || [];
                const currentMissionIds = groupMissions.map(m => m.id);

                const removedMissions = originalMissionIds.filter(id => !currentMissionIds.includes(id));
                if (removedMissions.length > 0) {
                    await supabase.from('missions').update({ group_id: null, sequence_order: null }).in('id', removedMissions);
                }

                // Then, update the sequence order and group_id for currently linked missions
                for (let i = 0; i < groupMissions.length; i++) {
                    const mission = groupMissions[i];
                    await supabase.from('missions')
                        .update({ group_id: groupId, sequence_order: i + 1 })
                        .eq('id', mission.id);
                }
            }

            setIsDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving mission group:', error);
            toast.error('ไม่สามารถบันทึกข้อมูลได้');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ยืนยันการลบกลุ่มภารกิจนี้? ภารกิจย่อยจะถูกปลดลิงก์ออก')) return;
        try {
            // First, unlink all missions in this group (though FK might be ON DELETE SET NULL, good to be safe or explicit)
            await supabase.from('missions').update({ group_id: null, sequence_order: null }).eq('group_id', id);

            const { error } = await supabase.from('mission_groups').delete().eq('id', id);
            if (error) throw error;
            toast.success('ลบกลุ่มภารกิจเรียบร้อย');
            fetchData();
        } catch (error) {
            console.error('Error deleting mission group:', error);
            toast.error('ไม่สามารถลบกลุ่มภารกิจได้');
        }
    };

    const handleDuplicate = async (group: MissionGroup) => {
        try {
            const payload = {
                title: `${group.title} (สำเนา)`,
                description: group.description,
                grand_bonus_points: group.grand_bonus_points,
                grand_bonus_coins: group.grand_bonus_coins,
                is_active: false,
                start_date: null as string | null,
                end_date: null as string | null,
            };

            const { error } = await supabase.from('mission_groups').insert([payload]);
            if (error) throw error;
            toast.success('คัดลอกกลุ่มภารกิจเรียบร้อย');
            fetchData();
        } catch (error) {
            console.error('Error duplicating mission group:', error);
            toast.error('ไม่สามารถคัดลอกกลุ่มภารกิจได้');
        }
    };

    const toggleActive = async (group: MissionGroup) => {
        const newStatus = !group.is_active;
        const { error } = await supabase.from('mission_groups').update({ is_active: newStatus }).eq('id', group.id);
        if (error) {
            toast.error('ไม่สามารถอัปเดตสถานะได้');
        } else {
            fetchData();
        }
    };

    const addMissionToGroup = (mission: Mission) => {
        if (groupMissions.find(m => m.id === mission.id)) return;
        setGroupMissions([...groupMissions, { ...mission, sequence_order: groupMissions.length + 1 }]);
    };

    const removeMissionFromGroup = (missionId: string) => {
        setGroupMissions(prev => {
            const remaining = prev.filter(m => m.id !== missionId);
            // Re-adjust sequence orders
            return remaining.map((m, idx) => ({ ...m, sequence_order: idx + 1 }));
        });
    };

    const moveMissionUp = (index: number) => {
        if (index === 0) return;
        const newMissions = [...groupMissions];
        const temp = newMissions[index - 1];
        newMissions[index - 1] = newMissions[index];
        newMissions[index] = temp;
        // Update sequence orders
        setGroupMissions(newMissions.map((m, idx) => ({ ...m, sequence_order: idx + 1 })));
    };

    const moveMissionDown = (index: number) => {
        if (index === groupMissions.length - 1) return;
        const newMissions = [...groupMissions];
        const temp = newMissions[index + 1];
        newMissions[index + 1] = newMissions[index];
        newMissions[index] = temp;
        // Update sequence orders
        setGroupMissions(newMissions.map((m, idx) => ({ ...m, sequence_order: idx + 1 })));
    };

    const filteredGroups = groups.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Available missions to add (not in the current group, and optionally not in any other group)
    const availableMissions = allMissions.filter(m =>
        !groupMissions.find(gm => gm.id === m.id) &&
        // Optional: Only allow standalone missions or missions in THIS editing group
        (m.group_id === null || m.group_id === editingGroup?.id) &&
        m.title.toLowerCase().includes(availableMissionSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ListOrdered className="w-6 h-6" />
                        กลุ่มภารกิจต่อเนื่อง
                    </h1>
                    <p className="text-muted-foreground">ผูกภารกิจเข้าด้วยกันเป็นลำดับขั้น เพื่อรับโบนัสพิเศษ (Quest Chains)</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            สร้างกลุ่มภารกิจ
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full">
                        <DialogHeader>
                            <DialogTitle>{editingGroup ? 'แก้ไขกลุ่มภารกิจ' : 'สร้างกลุ่มภารกิจใหม่'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                                <h3 className="font-semibold text-primary">ข้อมูลทั่วไป</h3>
                                <div className="space-y-2">
                                    <Label>ชื่อกลุ่มภารกิจ *</Label>
                                    <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="เช่น ภารกิจต้อนรับสมาชิกใหม่" />
                                </div>
                                <div className="space-y-2">
                                    <Label>รายละเอียด</Label>
                                    <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="อธิบายเงื่อนไขกลุ่มภารกิจ" rows={2} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>โบนัสคะแนน (เมื่อผ่านทุกด่าน)</Label>
                                        <Input type="number" min="0" value={formData.grand_bonus_points} onChange={e => setFormData(p => ({ ...p, grand_bonus_points: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>โบนัสเหรียญ (เมื่อผ่านทุกด่าน)</Label>
                                        <Input type="number" min="0" value={formData.grand_bonus_coins} onChange={e => setFormData(p => ({ ...p, grand_bonus_coins: parseInt(e.target.value) || 0 }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>วันเริ่มต้น</Label>
                                        <Input type="datetime-local" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>วันสิ้นสุด</Label>
                                        <Input type="datetime-local" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>เปิดใช้งาน</Label>
                                    <Switch checked={formData.is_active} onCheckedChange={checked => setFormData(p => ({ ...p, is_active: checked }))} />
                                </div>
                            </div>

                            <div className="space-y-4 border p-4 rounded-lg bg-secondary/10">
                                <h3 className="font-semibold text-primary">จัดลำดับภารกิจย่อยในกลุ่ม</h3>

                                {/* Current missions in group */}
                                <div className="space-y-2">
                                    <Label>ภารกิจที่เลือก ({groupMissions.length})</Label>
                                    {groupMissions.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-4 bg-background border border-dashed rounded-md text-center">ยังไม่ได้เลือกภารกิจย่อย</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {groupMissions.map((m, idx) => (
                                                <div key={m.id} className="flex items-center justify-between bg-background p-3 rounded-md border shadow-sm">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <span className="bg-primary text-primary-foreground font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm font-medium line-clamp-1">{m.title}</span>
                                                    </div>
                                                    <div className="flex items-center shrink-0">
                                                        <div className="flex flex-col mr-2">
                                                            <Button type="button" variant="ghost" size="icon" className="h-4 w-6 px-0" disabled={idx === 0} onClick={() => moveMissionUp(idx)}>
                                                                ▲
                                                            </Button>
                                                            <Button type="button" variant="ghost" size="icon" className="h-4 w-6 px-0" disabled={idx === groupMissions.length - 1} onClick={() => moveMissionDown(idx)}>
                                                                ▼
                                                            </Button>
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMissionFromGroup(m.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-border my-4" />

                                {/* Available missions to add */}
                                <div className="space-y-2">
                                    <Label>เพิ่มภารกิจย่อย</Label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="ค้นหาภารกิจที่ต้องการเพิ่ม..."
                                            className="pl-8"
                                            value={availableMissionSearch}
                                            onChange={(e) => setAvailableMissionSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto border rounded-md bg-background divide-y">
                                        {availableMissions.length === 0 ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">ไม่พบภารกิจที่สามารถเพิ่มได้</div>
                                        ) : (
                                            availableMissions.map(m => (
                                                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                                                    <span className="text-sm font-medium line-clamp-1 mb-2 sm:mb-0 mr-2">{m.title}</span>
                                                    <Button type="button" size="sm" variant="secondary" onClick={() => addMissionToGroup(m)}>
                                                        <Plus className="h-3 w-3 mr-1" /> เพิ่ม
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                                <Button type="submit">บันทึก</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="p-4 border-b">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="ค้นหากลุ่มภารกิจ..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>ชื่อกลุ่มภารกิจ</TableHead>
                                    <TableHead>จำนวนด่าน</TableHead>
                                    <TableHead className="whitespace-nowrap">โบนัส (คะแนน/เหรียญ)</TableHead>
                                    <TableHead>ระยะเวลา</TableHead>
                                    <TableHead>ผู้เข้าร่วม</TableHead>
                                    <TableHead className="text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredGroups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            ไม่พบกลุ่มภารกิจ
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGroups.map((group) => (
                                        <TableRow key={group.id}>
                                            <TableCell>
                                                <Switch
                                                    checked={group.is_active}
                                                    onCheckedChange={() => toggleActive(group)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium line-clamp-2">{group.title}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">
                                                    {group.missions?.length || 0} ขั้น
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <span className="text-amber-600 font-semibold">P: +{group.grand_bonus_points}</span>
                                                    <span className="text-yellow-600 font-semibold">C: +{group.grand_bonus_coins}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {group.start_date || group.end_date ? (
                                                        <>
                                                            {group.start_date ? format(new Date(group.start_date), 'd MMM yy HH:mm', { locale: th }) : 'ไม่ระบุ'} -<br />
                                                            {group.end_date ? format(new Date(group.end_date), 'd MMM yy HH:mm', { locale: th }) : 'ไม่ระบุ'}
                                                        </>
                                                    ) : (
                                                        'ตลอดไป'
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                    onClick={() => setViewingParticipantsGroup(group)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(group)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(group)} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Participants Dialog */}
            {viewingParticipantsGroup && (
                <MissionGroupParticipantsDialog
                    group={viewingParticipantsGroup}
                    open={!!viewingParticipantsGroup}
                    onOpenChange={(open) => {
                        if (!open) setViewingParticipantsGroup(null);
                    }}
                />
            )}
        </div>
    );
}
