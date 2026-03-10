import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, ArrowRight, CheckCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from "@/lib/utils";

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
    allowed_sub_types?: Record<string, string[]> | null;
    allowed_tiers: string[] | null;
}

interface Registration {
    id: string;
    event_id: string;
    status: 'registered' | 'checked_in' | 'cancelled';
}

export default function Events() {
    const { profile } = useAuth();
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const canScanEvents = hasPermission('scan_events');

    // Fetch active events
    const { data: events = [], isLoading } = useQuery({
        queryKey: ['active_events'],
        queryFn: async () => {
            const now = new Date().toISOString();
            // Show events that haven't ended yet
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_active', true)
                .gte('end_date', now)
                .order('start_date', { ascending: true });

            if (error) throw error;

            const eventsData = data as Event[];

            return eventsData.filter(event => {
                // Check member type access
                if (event.allowed_member_types && event.allowed_member_types.length > 0) {
                    if (!profile?.member_type || !event.allowed_member_types.includes(profile.member_type)) {
                        return false;
                    }

                    // Check subtype access
                    if (event.allowed_sub_types && profile?.member_type) {
                        const allowedSubTypesForMember = event.allowed_sub_types[profile.member_type];
                        if (allowedSubTypesForMember && allowedSubTypesForMember.length > 0) {
                            if (!profile.member_sub_type || !allowedSubTypesForMember.includes(profile.member_sub_type)) {
                                return false; // User's subtype is not in the allowed list for their member type
                            }
                        }
                    }
                }

                // Check tier access
                if (event.allowed_tiers && event.allowed_tiers.length > 0) {
                    if (!profile?.tier || !event.allowed_tiers.includes(profile.tier.toLowerCase())) {
                        return false;
                    }
                }

                // Exclude mission_events from the general events page as they will be in SpecialMissionsSection
                // Or maybe keep them but add a badge? Let's keep them and add a visual indicator later.

                return true;
            });
        }
    });

    // Fetch user's registrations
    const { data: registrations = [], isLoading: isLoadingRegistrations } = useQuery({
        queryKey: ['my_registrations', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('event_registrations')
                .select('id, event_id, status')
                .eq('profile_id', profile?.id || '');

            if (error) throw error;
            return data as Registration[];
        },
        enabled: !!profile?.id
    });

    const registerMutation = useMutation({
        mutationFn: async (eventId: string) => {
            if (!profile?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from('event_registrations')
                .insert([{ event_id: eventId, profile_id: profile.id }])
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        },
        onSuccess: (registrationId, eventId) => {
            toast.success('ลงทะเบียนสำเร็จ');
            queryClient.invalidateQueries({ queryKey: ['my_registrations'] });
            // Navigate to the ticket page
            navigate(`/events/${eventId}/ticket`);
        },
        onError: (error) => {
            toast.error('เกิดข้อผิดพลาดในการลงทะเบียน');
            console.error(error);
        }
    });

    if (isLoading || isLoadingRegistrations) {
        return (
            <div className="flex justify-center flex-col items-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse">กำลังโหลดกิจกรรม...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <PageHeader title="กิจกรรมที่น่าสนใจ" onBack={() => navigate(-1)}>
                {canScanEvents && (
                    <Button onClick={() => navigate('/events/scanner')} variant="secondary" size="sm" className="hidden sm:flex shrink-0">
                        <QrCode className="w-4 h-4 mr-2" />
                        สแกน (Staff)
                    </Button>
                )}
            </PageHeader>

            <div className="container max-w-4xl py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">เลือกลงทะเบียนกิจกรรมที่คุณสนใจ และรับ QR Code สำหรับเช็คอินหน้างาน</p>
                </div>

                {canScanEvents && (
                    <div className="sm:hidden mb-4">
                        <Button onClick={() => navigate('/events/scanner')} variant="secondary" className="w-full">
                            <QrCode className="w-4 h-4 mr-2" />
                            โหมดสแกนเข้างาน (Staff)
                        </Button>
                    </div>
                )}

                {events.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                            <Calendar className="w-12 h-12 mb-4 text-slate-300" />
                            <p className="font-medium text-lg text-slate-700">ไม่มีกิจกรรมที่กำลังจะเปิดเร็วๆ นี้</p>
                            <p className="mt-2">โปรดติดตามกิจกรรมใหม่ๆ ของเราได้ในภายหลัง</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {events.map((event) => {
                            const registration = registrations.find(r => r.event_id === event.id);
                            const isRegistered = !!registration && registration.status !== 'cancelled';
                            const isCheckedIn = registration?.status === 'checked_in';

                            return (
                                <Card
                                    key={event.id}
                                    className={cn(
                                        "overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col border-2",
                                        isCheckedIn
                                            ? "bg-gradient-to-br from-emerald-100 via-emerald-50/50 to-emerald-200/50 border-emerald-400/50 shadow-emerald-900/10 shadow-md"
                                            : isRegistered
                                                ? "bg-gradient-to-br from-blue-100 via-blue-50/50 to-blue-200/50 border-blue-400/50 shadow-blue-900/10 shadow-md"
                                                : "border-transparent"
                                    )}
                                >
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <CardTitle className="text-xl leading-tight text-slate-800 line-clamp-2">{event.title}</CardTitle>
                                                {event.event_type === 'mission_event' && (
                                                    <Badge variant="outline" className="w-fit bg-rose-50 text-rose-700 border-rose-200 font-normal">ภารกิจพิเศษ (Missions)</Badge>
                                                )}
                                            </div>
                                            {isRegistered && (
                                                <Badge variant="default" className={isCheckedIn ? 'bg-green-600' : 'bg-primary'}>
                                                    {isCheckedIn ? 'เข้าร่วมแล้ว' : 'ลงทะเบียนแล้ว'}
                                                </Badge>
                                            )}
                                        </div>
                                        {event.description && (
                                            <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-3 flex-grow">
                                        <div className="flex items-start text-sm text-slate-600 gap-2">
                                            <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>
                                                {format(new Date(event.start_date), 'd MMMM yyyy', { locale: th })}
                                            </span>
                                        </div>
                                        <div className="flex items-start text-sm text-slate-600 gap-2">
                                            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>
                                                {format(new Date(event.start_date), 'HH:mm', { locale: th })} - {format(new Date(event.end_date), 'HH:mm', { locale: th })} น.
                                            </span>
                                        </div>
                                        {event.location && (
                                            <div className="flex items-start text-sm text-slate-600 gap-2">
                                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">{event.location}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className={cn(
                                        "pt-4 flex gap-2 border-t mt-auto",
                                        isCheckedIn
                                            ? "bg-emerald-100/50 border-emerald-200"
                                            : isRegistered
                                                ? "bg-blue-100/50 border-blue-200"
                                                : "bg-slate-50 border-slate-100"
                                    )}>
                                        {isRegistered ? (
                                            <Button
                                                className={cn(
                                                    "w-full transition-colors",
                                                    isCheckedIn ? "bg-emerald-600 hover:bg-emerald-700 text-white border-none" : ""
                                                )}
                                                variant={isCheckedIn ? "default" : "default"}
                                                onClick={() => navigate(`/events/${event.id}/ticket`)}
                                            >
                                                {isCheckedIn ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2 text-white" />
                                                        เช็คอินเรียบร้อยแล้ว
                                                    </>
                                                ) : (
                                                    <>
                                                        ดูตั๋ว QR Code ของคุณ
                                                        <ArrowRight className="w-4 h-4 ml-2" />
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full"
                                                onClick={() => registerMutation.mutate(event.id)}
                                                disabled={registerMutation.isPending}
                                            >
                                                {registerMutation.isPending ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนเข้าร่วมกิจกรรม'}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
