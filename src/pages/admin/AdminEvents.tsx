import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/AuthContext';
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Eye, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Event {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
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
    }>({
        title: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        is_active: true
    });

    const canManageEvents = hasPermission('manage_events');

    const { data: events = [], isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: false });
            if (error) throw error;
            return data as Event[];
        },
        enabled: canManageEvents,
    });

    const saveEventMutation = useMutation({
        mutationFn: async () => {
            const eventData = {
                title: formData.title,
                description: formData.description || null,
                location: formData.location || null,
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
                is_active: formData.is_active
            };

            if (editingEvent) {
                const { error } = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('events')
                    .insert([eventData]);
                if (error) throw error;
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
            toast.error('เกิดข้อผิดพลาดในการลบกิจกรรม อาจะมีการลงทะเบียนผูกอยู่');
            console.error(error);
        }
    });

    const handleOpenDialog = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            // Format datetime strings for input[type="datetime-local"]
            // Expected format: YYYY-MM-DDThh:mm
            const formatForInput = (dateStr: string) => {
                const d = new Date(dateStr);
                // Adjust for local timezone offset before converting to ISO string substring
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
                is_active: event.is_active
            });
        } else {
            setEditingEvent(null);
            setFormData({
                title: '',
                description: '',
                location: '',
                start_date: '',
                end_date: '',
                is_active: true
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
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            ยังไม่มีกิจกรรมในระบบ
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">ชื่อกิจกรรมและสถานที่</TableHead>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรมใหม่'}</DialogTitle>
                        <DialogDescription>
                            กำหนดรายละเอียดของกิจกรรม วันเวลา สถานที่จัดงาน
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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

                        <DialogFooter className="pt-4">
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
