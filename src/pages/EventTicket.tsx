import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
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
}

export default function EventTicket() {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();

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
        enabled: !!eventId
    });

    const { data: registration, isLoading: isLoadingRegistration } = useQuery({
        queryKey: ['my_registration', eventId, profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('event_registrations')
                .select('id, status')
                .eq('event_id', eventId)
                .eq('profile_id', profile?.id || '')
                .maybeSingle(); // Important: use maybeSingle since the user might not be registered

            if (error) throw error;
            return data as Registration | null;
        },
        enabled: !!eventId && !!profile?.id
    });

    const isLoading = isLoadingEvent || isLoadingRegistration;

    const [qrValue, setQrValue] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        if (!registration?.id || registration.status === 'checked_in') return;

        const updateQr = () => {
            setQrValue(JSON.stringify({
                r: registration.id,
                t: Date.now()
            }));
            setTimeLeft(60);
        };

        updateQr();

        const qrInterval = setInterval(updateQr, 60000);

        const timerInterval = setInterval(() => {
            setTimeLeft(prev => prev > 0 ? prev - 1 : 60);
        }, 1000);

        return () => {
            clearInterval(qrInterval);
            clearInterval(timerInterval);
        };
    }, [registration?.id, registration?.status]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!event || !registration || registration.status === 'cancelled') {
        return (
            <div className="container max-w-md py-12 text-center space-y-4">
                <h2 className="text-2xl font-bold">ไม่พบตั๋วของกิจกรรมนี้</h2>
                <p className="text-muted-foreground">คุณอาจยังไม่ได้ลงทะเบียน หรือกิจกรรมได้ถูกยกเลิกไปแล้ว</p>
                <Button onClick={() => navigate('/events')}>กลับไปหน้ากิจกรรม</Button>
            </div>
        );
    }

    const isCheckedIn = registration.status === 'checked_in';

    return (
        <div className="container max-w-md py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button variant="ghost" className="mb-2" onClick={() => navigate('/events')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                ย้อนกลับ
            </Button>

            <Card className={`overflow-hidden border-2 ${isCheckedIn ? 'border-green-500 bg-green-50/30' : 'border-primary'}`}>
                <div className={`h-2 ${isCheckedIn ? 'bg-green-500' : 'bg-primary'}`} />
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-slate-800">{event.title}</CardTitle>
                    <CardDescription className="text-slate-600">
                        บัตรเข้างานอิเล็กทรอนิกส์ (E-Ticket)
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-inner flex flex-col items-center justify-center">
                        {isCheckedIn ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-green-700">เช็คอินสำเร็จ!</h3>
                                <p className="text-sm text-slate-500">คุณได้เช็คอินเข้างานเรียบร้อยแล้ว</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 bg-white border-4 border-slate-100 rounded-xl relative">
                                    {/* Background pattern for qr code area */}
                                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                                    <div className="relative z-10">
                                        <QRCode
                                            value={qrValue || registration.id}
                                            size={200}
                                            viewBox={`0 0 200 200`}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            level="H" // High error correction so logos/stylings could be added later
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 w-full max-w-[200px] text-center space-y-2">
                                    <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm bg-primary/10 rounded-full py-1.5 px-3">
                                        <Clock className="w-4 h-4" />
                                        QR Code อัปเดตใน {timeLeft} วิ
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        โปรดแสดง QR Code นี้แก่พนักงาน<br />
                                        ห้ามแคปหน้าจอเพื่อป้องกันการสวมสิทธิ์<br />
                                        รหัสอ้างอิง: <span className="font-mono text-slate-400">{registration.id.split('-')[0]}</span>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-sm text-slate-700 border-b pb-2">รายละเอียดกิจกรรม</h4>
                        <div className="space-y-3">
                            <div className="flex items-start text-sm text-slate-600 gap-3">
                                <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <span className="block font-medium text-slate-800">วันที่</span>
                                    <span>{format(new Date(event.start_date), 'd MMMM yyyy', { locale: th })}</span>
                                </div>
                            </div>
                            <div className="flex items-start text-sm text-slate-600 gap-3">
                                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <span className="block font-medium text-slate-800">เวลา</span>
                                    <span>{format(new Date(event.start_date), 'HH:mm', { locale: th })} - {format(new Date(event.end_date), 'HH:mm', { locale: th })} น.</span>
                                </div>
                            </div>
                            {event.location && (
                                <div className="flex items-start text-sm text-slate-600 gap-3">
                                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <span className="block font-medium text-slate-800">สถานที่</span>
                                        <span>{event.location}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center pt-4">
                <p className="text-xs text-muted-foreground">
                    หากพบปัญหาในการเช็คอิน โปรดติดต่อเจ้าหน้าที่ดูแลกิจกรรม
                </p>
            </div>
        </div>
    );
}
