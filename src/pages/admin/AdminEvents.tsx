import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/AuthContext';
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Eye, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';

type MemberType = Database['public']['Enums']['member_type'];
type TierLevel = Database['public']['Enums']['tier_level'];

const MEMBER_TYPES_OPTIONS: { label: string, value: MemberType }[] = [
    { label: 'ฟาร์ม', value: 'farm' },
    { label: 'พนักงานบริษัท', value: 'company_employee' },
    { label: 'สัตวแพทย์', value: 'veterinarian' },
    { label: 'ร้านค้าปศุสัตว์', value: 'livestock_shop' },
];

// Will fetch dynamically now
const FALLBACK_TIER_OPTIONS: { label: string, value: TierLevel }[] = [
    { label: 'บรอนซ์', value: 'bronze' },
    { label: 'ซิลเวอร์', value: 'silver' },
    { label: 'โกลด์', value: 'gold' },
    { label: 'แพลตตินัม', value: 'platinum' },
];

interface EventReward {
    id?: string;
    event_id?: string;
    member_type: string | null;
    tier_name: string | null;
    points_reward: number;
    coins_reward: number;
}

interface Event {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_date: string;
    end_date: string;
    is_active: boolean;
    event_type: string | null;
    allowed_member_types: string[] | null;
    allowed_tiers: string[] | null;
    mission_id: string | null;
    created_at?: string;
    updated_at?: string;
    event_rewards?: EventReward[];
}

export default function AdminEvents() {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        location: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
        event_type: string;
        allowed_member_types: string[];
        allowed_tiers: string[];
        mission_id: string | null;
        rewards: EventReward[];
    }>({
        title: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        is_active: true,
        event_type: 'general_event',
        allowed_member_types: [],
        allowed_tiers: [],
        mission_id: null,
        rewards: []
    });

    const canManageEvents = hasPermission('manage_events');

    const { data: events = [], isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*, event_rewards(*)')
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data as Event[];
        },
        enabled: canManageEvents,
    });

    const { data: missions = [] } = useQuery({
        queryKey: ['missions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('missions')
                .select('id, title')
                .eq('is_active', true);
            if (error) throw error;
            return data;
        },
        enabled: canManageEvents,
    });

    const { data: tiersData = [] } = useQuery({
        queryKey: ['tier-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tier_settings')
                .select('tier, display_name')
                .order('min_points', { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    const TIER_OPTIONS = tiersData.length > 0
        ? tiersData.map(t => ({ label: t.display_name, value: t.tier as TierLevel }))
        : FALLBACK_TIER_OPTIONS;

    const saveEventMutation = useMutation({
        mutationFn: async () => {
            const eventData = {
                title: formData.title,
                description: formData.description || null,
                location: formData.location || null,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
                is_active: formData.is_active,
                event_type: formData.event_type,
                allowed_member_types: formData.allowed_member_types.length > 0 ? formData.allowed_member_types : null,
                allowed_tiers: formData.allowed_tiers.length > 0 ? formData.allowed_tiers : null,
                mission_id: formData.event_type === 'mission_event' ? formData.mission_id : null
            };

            let eventId = editingEvent?.id;

            if (eventId) {
                const { error } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', eventId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('events')
                    .insert([eventData])
                    .select()
                    .single();
                if (error) throw error;
                eventId = data.id;
            }

            // Handle rewards
            // Delete all existing rewards for this event
            if (eventId) {
                await supabase.from('event_rewards').delete().eq('event_id', eventId);

                // Insert new rewards
                const rewardsToInsert = formData.rewards.filter(r => r.points_reward > 0 || r.coins_reward > 0).map(r => ({
                    event_id: eventId,
                    member_type: r.member_type,
                    tier_name: r.tier_name,
                    points_reward: Number(r.points_reward),
                    coins_reward: Number(r.coins_reward)
                }));

                if (rewardsToInsert.length > 0) {
                    const { error: rewardsError } = await supabase
                        .from('event_rewards')
                        .insert(rewardsToInsert);
                    if (rewardsError) throw rewardsError;
                }
            }
        },
        onSuccess: () => {
            toast.success(editingEvent ? 'อัปเดตกิจกรรมสำเร็จ' : 'สร้างกิจกรรมสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['events'] });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            console.error(error);
        }
    });

    const deleteEventMutation = useMutation({
        mutationFn: async (eventId: string) => {
            const { error } = await supabase.from('events').delete().eq('id', eventId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('ลบกิจกรรมสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการลบกิจกรรม อาจมีการลงทะเบียนผูกอยู่');
            console.error(error);
        }
    });

    const handleOpenDialog = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            const formatForInput = (dateStr: string) => {
                const d = new Date(dateStr);
                const offset = d.getTimezoneOffset() * 60000;
                const localDate = new Date(d.getTime() - offset);
                return localDate.toISOString().slice(0, 16);
            };

            setFormData({
                title: event.title,
                description: event.description || '',
                location: event.location || '',
                start_date: formatForInput(event.start_date),
                end_date: formatForInput(event.end_date),
                is_active: event.is_active,
                event_type: event.event_type || 'general_event',
                allowed_member_types: event.allowed_member_types || [],
                allowed_tiers: event.allowed_tiers || [],
                mission_id: event.mission_id || null,
                rewards: event.event_rewards || []
            });
        } else {
            setEditingEvent(null);
            setFormData({
                title: '',
                description: '',
                location: '',
                start_date: '',
                end_date: '',
                is_active: true,
                event_type: 'general_event',
                allowed_member_types: [],
                allowed_tiers: [],
                mission_id: null,
                rewards: []
            });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.start_date || !formData.end_date) {
            toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
            return;
        }

        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            toast.error('วันสิ้นสุดต้องมากกว่าวันเริ่มต้น');
            return;
        }

        if (formData.event_type === 'mission_event' && !formData.mission_id) {
            toast.error('กรุณาเลือกภารกิจ (Mission) ที่เกี่ยวข้อง');
            return;
        }

        saveEventMutation.mutate();
    };

    const handleToggleMemberType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            allowed_member_types: prev.allowed_member_types.includes(type)
                ? prev.allowed_member_types.filter(t => t !== type)
                : [...prev.allowed_member_types, type]
        }));
    };

    const handleToggleTier = (tier: string) => {
        setFormData(prev => ({
            ...prev,
            allowed_tiers: prev.allowed_tiers.includes(tier)
                ? prev.allowed_tiers.filter(t => t !== tier)
                : [...prev.allowed_tiers, tier]
        }));
    };

    const addRewardConfig = () => {
        setFormData(prev => ({
            ...prev,
            rewards: [...prev.rewards, { member_type: null, tier_name: null, points_reward: 0, coins_reward: 0 }]
        }));
    };

    const updateRewardConfig = (index: number, field: keyof EventReward, value: any) => {
        const newRewards = [...formData.rewards];
        if (field === 'member_type' && value === 'all') value = null;
        if (field === 'tier_name' && value === 'all') value = null;
        newRewards[index] = { ...newRewards[index], [field]: value };
        setFormData(prev => ({ ...prev, rewards: newRewards }));
    };

    const removeRewardConfig = (index: number) => {
        const newRewards = [...formData.rewards];
        newRewards.splice(index, 1);
        setFormData(prev => ({ ...prev, rewards: newRewards }));
    };

    if (!canManageEvents) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <CalendarIcon className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-slate-500">คุณไม่มีสิทธิ์ในการจัดการกิจกรรมอีเวนต์</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">จัดการกิจกรรมอีเวนต์</h1>
                    <p className="text-muted-foreground">สร้าง อัปเดต และติดตามการลงทะเบียนเข้าร่วมกิจกรรม</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    สร้างกิจกรรมใหม่
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>รายการกิจกรรมทั้งหมด</CardTitle>
                    <CardDescription>แสดงกิจกรรมเรียงลำดับตามวันที่เริ่มกิจกรรม</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            ยังไม่มีกิจกรรมในระบบ
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">ชื่อกิจกรรมและสถานที่</TableHead>
                                    <TableHead>ประเภท</TableHead>
                                    <TableHead>วัน-เวลา</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead className="w-[150px] text-right">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            <div className="font-medium">{event.title}</div>
                                            {event.location && (
                                                <div className="text-sm text-muted-foreground flex items-center mt-1">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {event.event_type === 'mission_event' ? 'ภารกิจพิเศษ' : 'กิจกรรมทั่วไป'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {format(new Date(event.start_date), 'd MMM yyyy HH:mm', { locale: th })}
                                                {' - '}
                                                {format(new Date(event.end_date), 'HH:mm', { locale: th })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={event.is_active ? 'default' : 'secondary'}>
                                                {event.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => navigate(`/admin/events/${event.id}`)}
                                                    title="ดูรายละเอียด/ผู้ลงทะเบียน"
                                                >
                                                    <Eye className="w-4 h-4 text-slate-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(event)}
                                                    title="แก้ไขกิจกรรม"
                                                >
                                                    <Pencil className="w-4 h-4 text-blue-500" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบกิจกรรม "${event.title}"? ข้อมูลการลงทะเบียนทั้งหมดที่ผูกกับกิจกรรมนี้อาจได้รับผลกระทบ`)) {
                                                            deleteEventMutation.mutate(event.id);
                                                        }
                                                    }}
                                                    title="ลบกิจกรรม"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</DialogTitle>
                        <DialogDescription>
                            กำหนดรายละเอียดของกิจกรรม รูปแบบการเข้าถึง และของรางวัลเมื่อสแกนเข้างาน
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">ข้อมูลพื้นฐาน</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">ชื่อกิจกรรม <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="เช่น การอบรมพนักงานขาย 2024"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="event_type">ประเภทกิจกรรม</Label>
                                    <Select
                                        value={formData.event_type}
                                        onValueChange={(value) => setFormData({ ...formData, event_type: value, mission_id: value === 'general_event' ? null : formData.mission_id })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกประเภทกิจกรรม" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="general_event">กิจกรรมทั่วไป</SelectItem>
                                            <SelectItem value="mission_event">เชื่อมโยงกับภารกิจ (Mission)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.event_type === 'mission_event' && (
                                <div className="space-y-2">
                                    <Label htmlFor="mission_id">เลือกภารกิจที่เกี่ยวข้อง <span className="text-red-500">*</span></Label>
                                    <Select
                                        value={formData.mission_id || ''}
                                        onValueChange={(value) => setFormData({ ...formData, mission_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกภารกิจ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {missions.map(mission => (
                                                <SelectItem key={mission.id} value={mission.id}>{mission.title}</SelectItem>
                                            ))}
                                            {missions.length === 0 && (
                                                <SelectItem value="empty" disabled>ไม่พบภารกิจที่เปิดใช้งาน</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียดกิจกรรม</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="รายละเอียด หัวข้อการอบรม..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">วัน-เวลาเริ่ม <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="start_date"
                                        type="datetime-local"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">วัน-เวลาสิ้นสุด <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="end_date"
                                        type="datetime-local"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="location">สถานที่จัดกิจกรรม</Label>
                                    <Input
                                        id="location"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="เช่น โรงแรม... ห้องประชุม..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="is_active">สถานะกิจกรรม</Label>
                                    <Select
                                        value={formData.is_active ? 'active' : 'inactive'}
                                        onValueChange={(value) => setFormData({ ...formData, is_active: value === 'active' })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกสถานะ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">เปิดใช้งาน</SelectItem>
                                            <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-t pt-4">สิทธิ์การเข้าถึง (Access Control)</h3>
                            <p className="text-sm text-muted-foreground">หากไม่เลือก ระบบจะอนุญาตให้ทุกคนเข้าถึงกิจกรรมได้</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label>ประเภทสมาชิกที่อนุญาต</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {MEMBER_TYPES_OPTIONS.map(opt => (
                                            <div key={opt.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`member_${opt.value}`}
                                                    checked={formData.allowed_member_types.includes(opt.value)}
                                                    onCheckedChange={() => handleToggleMemberType(opt.value)}
                                                />
                                                <label htmlFor={`member_${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label>ระดับสมาชิก (Tier) ที่อนุญาต</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TIER_OPTIONS.map(opt => (
                                            <div key={opt.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`tier_${opt.value}`}
                                                    checked={formData.allowed_tiers.includes(opt.value)}
                                                    onCheckedChange={() => handleToggleTier(opt.value)}
                                                />
                                                <label htmlFor={`tier_${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-t pt-4">
                                <div>
                                    <h3 className="text-lg font-semibold">การให้รางวัลเมื่อสแกนเข้างาน</h3>
                                    <p className="text-sm text-muted-foreground">กำหนดคะแนน/เหรียญที่แจกให้แต่ละกลุ่ม (เว้นว่าง = ได้รับทุกคนที่มีสิทธิ์ร่วมงาน)</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addRewardConfig}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    เพิ่มเงื่อนไขรางวัล
                                </Button>
                            </div>

                            {formData.rewards.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground bg-slate-50 rounded-md">
                                    ยังไม่มีการกำหนดเงื่อนไขรางวัล (กิจกรรมนี้จะไม่มีการแจกคะแนน/เหรียญเมื่อเช็คอิน)
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {formData.rewards.map((reward, index) => (
                                        <div key={index} className="flex items-end gap-3 p-3 border rounded-md bg-slate-50 relative">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500"
                                                onClick={() => removeRewardConfig(index)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                            <div className="grid grid-cols-4 gap-3 w-full pt-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">ประเภทสมาชิก</Label>
                                                    <Select
                                                        value={reward.member_type || 'all'}
                                                        onValueChange={(val) => updateRewardConfig(index, 'member_type', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                                            {MEMBER_TYPES_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">ระดับสมาชิก (Tier)</Label>
                                                    <Select
                                                        value={reward.tier_name || 'all'}
                                                        onValueChange={(val) => updateRewardConfig(index, 'tier_name', val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                                            {TIER_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">คะแนนที่ได้</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={reward.points_reward}
                                                        onChange={(e) => updateRewardConfig(index, 'points_reward', Number(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">เหรียญที่ได้</Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-sm"
                                                        value={reward.coins_reward}
                                                        onChange={(e) => updateRewardConfig(index, 'coins_reward', Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={saveEventMutation.isPending}>
                                {saveEventMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
