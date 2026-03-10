import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, UserCheck, Calendar, MapPin, Clock, Search, XCircle, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface EventDetails {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    is_active: boolean;
}

interface Registration {
    id: string;
    status: 'registered' | 'checked_in' | 'cancelled';
    checked_in_at: string | null;
    created_at: string;
    profile: {
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        email: string | null;
    };
    scanned_by_profile: {
        first_name: string | null;
        last_name: string | null;
    } | null;
}

export default function AdminEventDetail() {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const { profile: currentUserProfile } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    const canManageEvents = hasPermission('manage_events');
    const canScanEvents = hasPermission('scan_events');

    const { data: event, isLoading: isLoadingEvent } = useQuery({
        queryKey: ['event', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            return data as EventDetails;
        },
        enabled: !!eventId && (canManageEvents || canScanEvents),
    });

    const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery({
        queryKey: ['event_registrations', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('event_registrations')
                .select(`
          id,
          status,
          checked_in_at,
          created_at,
          profile:profiles!event_registrations_profile_id_fkey (
            first_name,
            last_name,
            phone,
            email
          ),
          scanned_by_profile:profiles!event_registrations_scanned_by_fkey (
            first_name,
            last_name
          )
        `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Supabase join query returns an array or single object for relations. We assume it's an object here.
            return data as unknown as Registration[];
        },
        enabled: !!eventId && (canManageEvents || canScanEvents),
    });

    const checkInMutation = useMutation({
        mutationFn: async ({ registrationId, status }: { registrationId: string, status: 'checked_in' | 'cancelled' | 'registered' }) => {
            if (status === 'checked_in') {
                // Use RPC for check-in to handle missions and distribute rewards
                const { error } = await supabase.rpc('process_event_checkin', {
                    p_registration_id: registrationId,
                    p_scanned_by: currentUserProfile?.id || null
                });

                if (error) throw error;
            } else if (status === 'registered') {
                // Revert check-in
                const { error } = await supabase.rpc('revert_event_checkin', {
                    p_registration_id: registrationId
                });

                if (error) throw error;
            } else {
                // Cancel
                const { error } = await supabase
                    .from('event_registrations')
                    .update({ status: 'cancelled' })
                    .eq('id', registrationId);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('อัปเดตสถานะสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['event_registrations', eventId] });
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
            console.error(error);
        }
    });

    if (!canManageEvents && !canScanEvents) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <XCircle className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-slate-500">คุณไม่มีสิทธิ์ดูรายละเอียดกิจกรรม</p>
            </div>
        );
    }

    const filteredRegistrations = registrations.filter(reg => {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${reg.profile?.first_name || ''} ${reg.profile?.last_name || ''}`.toLowerCase();
        const phone = reg.profile?.phone || '';
        const email = reg.profile?.email?.toLowerCase() || '';

        return fullName.includes(searchLower) || phone.includes(searchLower) || email.includes(searchLower);
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'registered': return <Badge variant="secondary">ลงทะเบียนแล้ว</Badge>;
            case 'checked_in': return <Badge variant="default" className="bg-green-600">เข้าร่วมงาน</Badge>;
            case 'cancelled': return <Badge variant="destructive">ยกเลิก</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const totalRegistered = registrations.length;
    const totalCheckedIn = registrations.filter(r => r.status === 'checked_in').length;

    const handleExportCSV = () => {
        if (!filteredRegistrations || filteredRegistrations.length === 0) {
            toast.error('ไม่มีข้อมูลสำหรับ Export');
            return;
        }

        const headers = ['รหัส', 'ชื่อ', 'นามสกุล', 'เบอร์โทร', 'อีเมล', 'วันที่ลงทะเบียน', 'สถานะ', 'วันเวลาเช็คอิน', 'ผู้สแกน'];

        const rows = filteredRegistrations.map(reg => {
            const statusText = reg.status === 'registered' ? 'ลงทะเบียนแล้ว' :
                reg.status === 'checked_in' ? 'เข้าร่วมงาน' : 'ยกเลิก';

            const createdAt = format(new Date(reg.created_at), 'dd/MM/yyyy HH:mm:ss');
            const checkedInAt = reg.checked_in_at ? format(new Date(reg.checked_in_at), 'dd/MM/yyyy HH:mm:ss') : '-';

            const scannedByText = reg.scanned_by_profile ?
                `${reg.scanned_by_profile.first_name || ''} ${reg.scanned_by_profile.last_name || ''}`.trim() : '-';

            return [
                reg.id.split('-')[0], // Use short ID as displayed
                `"${reg.profile?.first_name || ''}"`,
                `"${reg.profile?.last_name || ''}"`,
                `"${reg.profile?.phone || ''}"`,
                `"${reg.profile?.email || ''}"`,
                createdAt,
                statusText,
                checkedInAt,
                `"${scannedByText}"`
            ].join(',');
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);

        const filename = `event_participants_${event?.title ? event.title.replace(/\s+/g, '_') : 'export'}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/admin/events')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">รายละเอียดกิจกรรม</h1>
                    <p className="text-muted-foreground">จัดการผู้เข้าร่วมและสแกนเข้างาน</p>
                </div>
            </div>

            {isLoadingEvent ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : event ? (
                <Card className="bg-primary/5 border-none">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                    {event.title}
                                    <Badge variant={event.is_active ? 'default' : 'secondary'}>
                                        {event.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                    </Badge>
                                </h2>
                                {event.description && <p className="text-slate-600">{event.description}</p>}

                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 mt-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span>เริ่ม: {format(new Date(event.start_date), 'd MMM yy HH:mm', { locale: th })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary" />
                                        <span>สิ้นสุด: {format(new Date(event.end_date), 'd MMM yy HH:mm', { locale: th })}</span>
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            <span>{event.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm text-center min-w-[120px]">
                                    <p className="text-sm text-muted-foreground mb-1">ลงทะเบียนทั้งหมด</p>
                                    <p className="text-3xl font-bold text-primary">{totalRegistered}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg shadow-sm text-center min-w-[120px]">
                                    <p className="text-sm text-muted-foreground mb-1">เข้าร่วมแล้ว</p>
                                    <p className="text-3xl font-bold text-green-600">{totalCheckedIn}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-8">ไม่พบกิจกรรม</div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>รายชื่อผู้เข้าร่วม</CardTitle>
                        <CardDescription>รายชื่อสมาชิกที่ลงทะเบียนสำหรับกิจกรรมนี้</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-48 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="ค้นหาชื่อ, เบอร์โทร..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={handleExportCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            <span className="hidden md:inline">Export CSV</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingRegistrations ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredRegistrations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            ไม่พบข้อมูลผู้ลงทะเบียน
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รหัส</TableHead>
                                    <TableHead>ชื่อ - นามสกุล</TableHead>
                                    <TableHead>เบอร์โทร</TableHead>
                                    <TableHead>วันที่ลงทะเบียน</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>ผู้สแกน</TableHead>
                                    <TableHead className="text-right">จัดการ (สแกนแทน)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRegistrations.map((reg) => (
                                    <TableRow key={reg.id}>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {reg.id.split('-')[0]}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {reg.profile?.first_name} {reg.profile?.last_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {reg.profile?.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>{reg.profile?.phone}</TableCell>
                                        <TableCell className="text-sm">
                                            {format(new Date(reg.created_at), 'd MMM yy HH:mm', { locale: th })}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(reg.status)}
                                            {reg.status === 'checked_in' && reg.checked_in_at && (
                                                <div className="text-xs text-muted-foreground mt-1 text-nowrap">
                                                    {format(new Date(reg.checked_in_at), 'd MMM yy HH:mm', { locale: th })}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {reg.scanned_by_profile ? (
                                                <span className="text-xs text-slate-600">
                                                    {reg.scanned_by_profile.first_name} {reg.scanned_by_profile.last_name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {reg.status === 'registered' ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                                                    onClick={() => {
                                                        if (window.confirm(`ยืนยันการเช็คอินให้คุณ ${reg.profile?.first_name}?`)) {
                                                            checkInMutation.mutate({ registrationId: reg.id, status: 'checked_in' });
                                                        }
                                                    }}
                                                    disabled={!canScanEvents || checkInMutation.isPending}
                                                >
                                                    <UserCheck className="w-4 h-4 mr-2" />
                                                    เช็คอิน (Manual)
                                                </Button>
                                            ) : reg.status === 'checked_in' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-400"
                                                    onClick={() => {
                                                        if (window.confirm('ต้องการยกเลิกการเช็คอินหรือไม่?')) {
                                                            checkInMutation.mutate({ registrationId: reg.id, status: 'registered' });
                                                        }
                                                    }}
                                                    disabled={!canScanEvents || checkInMutation.isPending}
                                                >
                                                    ยกเลิกเช็คอิน
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
