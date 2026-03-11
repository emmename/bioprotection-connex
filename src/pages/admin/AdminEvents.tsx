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
import { MEMBER_TYPE_OPTIONS as MEMBER_TYPES_OPTIONS, MEMBER_SUB_TYPES, FALLBACK_TIER_OPTIONS, type MemberType, type TierLevel } from '@/constants/memberTypes';


import { EventTable, type AdminEvent, type EventReward } from '@/components/admin/EventTable';
import { EventFormDialog } from '@/components/admin/EventFormDialog';

export default function AdminEvents() {
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);

    const [formData, setFormData] = useState<{
        title: string;
        description: string;
        location: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
        event_type: string;
        allowed_member_types: string[];
        allowed_sub_types: Record<string, string[]>;
        allowed_tiers: string[];
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
        allowed_sub_types: {},
        allowed_tiers: [],
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
            return data as AdminEvent[];
        },
        enabled: canManageEvents,
    });



    const { data: tiersData = [] } = useQuery({
        queryKey: ['tier-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tier_settings')
                .select('tier, display_name, color')
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
                allowed_sub_types: Object.keys(formData.allowed_sub_types).length > 0 ? formData.allowed_sub_types : null,
                allowed_tiers: formData.allowed_tiers.length > 0 ? formData.allowed_tiers : null
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

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from('events')
                .update({ is_active })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('อัปเดตสถานะการใช้งานสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
            console.error(error);
        }
    });

    const handleOpenDialog = (event?: AdminEvent) => {
        if (event) {
            setEditingEvent(event);
            const formatForInput = (dateStr?: string | null) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return '';
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
                allowed_sub_types: (event.allowed_sub_types as Record<string, string[]>) || {},
                allowed_tiers: event.allowed_tiers || [],
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
                allowed_sub_types: {},
                allowed_tiers: [],
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

        saveEventMutation.mutate();
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
                    ) : (
                            <EventTable
                                events={events}
                                tiersData={tiersData}
                                onView={(id) => navigate(`/admin/events/${id}`)}
                                onEdit={handleOpenDialog}
                                onDelete={(id, title) => {
                                    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบกิจกรรม "${title}"? ข้อมูลการลงทะเบียนทั้งหมดที่ผูกกับกิจกรรมนี้อาจได้รับผลกระทบ`)) {
                                        deleteEventMutation.mutate(id);
                                    }
                                }}
                                onToggleStatus={(id, is_active) => toggleStatusMutation.mutate({ id, is_active })}
                            />
                    )}
                </CardContent>
            </Card>

            <EventFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingEvent={editingEvent}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                isSaving={saveEventMutation.isPending}
                tierOptions={TIER_OPTIONS}
            />
        </div>
    );
}
