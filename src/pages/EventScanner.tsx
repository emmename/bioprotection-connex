import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions, useAuth } from '@/contexts/AuthContext';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';

interface Event {
    id: string;
    title: string;
    is_visible: boolean;
}

export default function EventScanner() {
    const { hasPermission } = usePermissions();
    const { profile: currentUserProfile } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const canScanEvents = hasPermission('scan_events');

    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [scanResult, setScanResult] = useState<{
        status: 'success' | 'error' | 'already_checked_in' | 'idle';
        message?: string;
        userName?: string;
    }>({ status: 'idle' });

    const { data: activeEvents = [], isLoading: eventsLoading } = useQuery({
        queryKey: ['active_events_for_scanner'],
        queryFn: async () => {
            // Get events that are active and not ended yet (include hidden events for staff)
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('events')
                .select('id, title, is_visible')
                .eq('is_active', true)
                .gte('end_date', now)
                .order('start_date', { ascending: true });

            if (error) throw error;
            return data as Event[];
        },
        enabled: canScanEvents
    });

    // Get the selected event's visibility
    const selectedEvent = activeEvents.find(e => e.id === selectedEventId);
    const isHiddenEvent = selectedEvent ? !selectedEvent.is_visible : false;

    // --- Registration-based check-in (for visible events with ticket QR) ---
    const checkInMutation = useMutation({
        mutationFn: async ({ registrationId, eventId }: { registrationId: string, eventId: string }) => {
            let actualRegistrationId = registrationId;

            // Try to parse the QR code as JSON (the Dynamic QR format)
            try {
                const parsed = JSON.parse(registrationId);
                if (parsed && typeof parsed === 'object' && parsed.r && parsed.t) {
                    actualRegistrationId = parsed.r;

                    // Validate timestamp (must be within the last 120 seconds)
                    const qrTime = new Date(parsed.t).getTime();
                    const now = Date.now();
                    const diffSeconds = (now - qrTime) / 1000;

                    if (diffSeconds > 120 || diffSeconds < -120) {
                        throw new Error('QR Code หมดอายุ กรุณาเปิดหน้าจอใหม่บนมือถือของคุณเพื่ออัปเดต QR Code');
                    }
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes('หมดอายุ')) {
                    throw e;
                }
                // If it's not JSON, assume old raw uuid format
            }

            // Verify the registration exists and belongs to the selected event
            const { data: regData, error: regError } = await supabase
                .from('event_registrations')
                .select(`
          status, 
          event_id,
          profile:profiles(first_name, last_name)
        `)
                .eq('id', actualRegistrationId)
                .single();

            if (regError) {
                throw new Error('QR Code ไม่ถูกต้อง หรือไม่พบข้อมูลการลงทะเบียน');
            }

            if (regData.event_id !== eventId) {
                throw new Error('QR Code นี้ไม่ใช่สำหรับกิจกรรมที่เลือก');
            }

            if (regData.status === 'checked_in') {
                const profile = Array.isArray(regData.profile) ? regData.profile[0] : regData.profile;
                const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'ผู้ใช้งาน';
                throw new Error(`already_checked_in:${name}`);
            }

            if (regData.status === 'cancelled') {
                throw new Error('การลงทะเบียนนี้ถูกยกเลิกไปแล้ว');
            }

            // Perform check in via RPC
            const { error: rpcError } = await supabase
                .rpc('process_event_checkin', {
                    p_registration_id: actualRegistrationId,
                    p_scanned_by: currentUserProfile?.id
                });

            if (rpcError) throw rpcError;

            const profile = Array.isArray(regData.profile) ? regData.profile[0] : regData.profile;
            return profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'ผู้ใช้งาน';
        },
        onSuccess: (userName) => {
            setScanResult({
                status: 'success',
                message: 'เช็คอินสำเร็จ',
                userName
            });
            playBeep(800);
            setTimeout(() => { setScanResult({ status: 'idle' }); }, 3000);
        },
        onError: (error: any) => {
            const errorMessage = error.message || 'เกิดข้อผิดพลาด';
            if (errorMessage.startsWith('already_checked_in:')) {
                const name = errorMessage.split(':')[1];
                setScanResult({ status: 'already_checked_in', message: 'เช็คอินไปแล้ว', userName: name });
            } else {
                setScanResult({ status: 'error', message: errorMessage });
            }
            playBeep(300);
            setTimeout(() => { setScanResult({ status: 'idle' }); }, 4000);
        }
    });

    // --- Member-based check-in (for hidden events with member QR) ---
    const memberCheckInMutation = useMutation({
        mutationFn: async ({ profileId, eventId }: { profileId: string, eventId: string }) => {
            // First get the member name for display
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', profileId)
                .single();

            if (profileError) {
                throw new Error('ไม่พบข้อมูลสมาชิก QR Code ไม่ถูกต้อง');
            }

            const name = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'ผู้ใช้งาน';

            // Call the member event check-in RPC
            const { error: rpcError } = await supabase
                .rpc('process_member_event_checkin', {
                    p_profile_id: profileId,
                    p_event_id: eventId,
                    p_scanned_by: currentUserProfile?.id
                });

            if (rpcError) {
                if (rpcError.message.includes('Already checked in')) {
                    throw new Error(`already_checked_in:${name}`);
                }
                throw rpcError;
            }

            return name;
        },
        onSuccess: (userName) => {
            setScanResult({
                status: 'success',
                message: 'เช็คอินสำเร็จ',
                userName
            });
            playBeep(800);
            setTimeout(() => { setScanResult({ status: 'idle' }); }, 3000);
        },
        onError: (error: any) => {
            const errorMessage = error.message || 'เกิดข้อผิดพลาด';
            if (errorMessage.startsWith('already_checked_in:')) {
                const name = errorMessage.split(':')[1];
                setScanResult({ status: 'already_checked_in', message: 'เช็คอินไปแล้ว', userName: name });
            } else {
                setScanResult({ status: 'error', message: errorMessage });
            }
            playBeep(300);
            setTimeout(() => { setScanResult({ status: 'idle' }); }, 4000);
        }
    });

    const playBeep = (freq: number) => {
        try {
            const audioCtx = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            // Audio context not supported — silently ignore
        }
    };

    useEffect(() => {
        if (!canScanEvents || !selectedEventId) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                videoConstraints: { facingMode: "environment" }
            },
            false
        );

        const onScanSuccess = (decodedText: string) => {
            if (checkInMutation.isPending || memberCheckInMutation.isPending || scanResult.status !== 'idle') return;

            // Detect QR type
            try {
                const parsed = JSON.parse(decodedText);
                if (parsed && typeof parsed === 'object') {
                    // Validate timestamp first
                    if (parsed.t) {
                        const qrTime = new Date(parsed.t).getTime();
                        const now = Date.now();
                        const diffSeconds = (now - qrTime) / 1000;
                        if (diffSeconds > 120 || diffSeconds < -120) {
                            setScanResult({ status: 'error', message: 'QR Code หมดอายุ กรุณาเปิดหน้าจอใหม่เพื่ออัปเดต QR Code' });
                            playBeep(300);
                            setTimeout(() => { setScanResult({ status: 'idle' }); }, 4000);
                            return;
                        }
                    }

                    if (parsed.p) {
                        // Member QR: { p: profile_id, t: timestamp }
                        memberCheckInMutation.mutate({
                            profileId: parsed.p,
                            eventId: selectedEventId
                        });
                        return;
                    }

                    if (parsed.r) {
                        // Ticket QR: { r: registration_id, t: timestamp }
                        checkInMutation.mutate({
                            registrationId: decodedText,
                            eventId: selectedEventId
                        });
                        return;
                    }
                }
            } catch (e) {
                // Not JSON — treat as raw registration ID (legacy)
            }

            // Fallback: treat as raw registration id
            checkInMutation.mutate({
                registrationId: decodedText,
                eventId: selectedEventId
            });
        };

        const onScanFailure = (error: any) => {
            // Ignored
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        };
    }, [selectedEventId, canScanEvents]);

    if (!canScanEvents) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 h-[60vh]">
                <XCircle className="w-16 h-16 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-700">ไม่มีสิทธิ์เข้าถึง</h2>
                <p className="text-slate-500">คุณไม่มีสิทธิ์ในการสแกน QR Code เข้างาน</p>
                <Button onClick={() => navigate('/events')}>กลับสู่หน้ากิจกรรม</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <PageHeader title="สแกนเข้างานอีเวนต์" onBack={() => navigate('/events')} />

            <main className="container max-w-lg mx-auto p-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">เลือกกิจกรรม</CardTitle>
                        <CardDescription>ระบุกิจกรรมที่คุณกำลังจะสแกนผู้เข้าร่วม</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {eventsLoading ? (
                            <div className="flex justify-center p-4">
                                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : activeEvents.length === 0 ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>ไม่พบกิจกรรม</AlertTitle>
                                <AlertDescription>
                                    ไม่มีกิจกรรมที่เปิดใช้งานในขณะนี้
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Select
                                value={selectedEventId}
                                onValueChange={setSelectedEventId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="-- กรุณาเลือกกิจกรรม --" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeEvents.map(event => (
                                        <SelectItem key={event.id} value={event.id}>
                                            {event.title} {!event.is_visible && '🔒'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </CardContent>
                </Card>

                {selectedEventId && isHiddenEvent && (
                    <Alert className="border-amber-300 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">กิจกรรมซ่อน</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            กิจกรรมนี้ไม่แสดงแก่สมาชิก ให้สแกน <strong>"QR ของฉัน"</strong> ของสมาชิกแทน QR ตั๋ว
                        </AlertDescription>
                    </Alert>
                )}

                {selectedEventId && (
                    <Card>
                        <CardContent className="pt-6 border-2 border-primary border-dashed rounded-lg bg-slate-50">
                            {/* Status Alert Area */}
                            {scanResult.status !== 'idle' && (
                                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 shadow-sm ${scanResult.status === 'success' ? 'bg-green-100 border border-green-300 text-green-800' :
                                    scanResult.status === 'already_checked_in' ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' :
                                        'bg-red-100 border border-red-300 text-red-800'
                                    }`}>
                                    {scanResult.status === 'success' && <CheckCircle2 className="w-8 h-8 flex-shrink-0" />}
                                    {scanResult.status === 'already_checked_in' && <AlertCircle className="w-8 h-8 flex-shrink-0" />}
                                    {scanResult.status === 'error' && <XCircle className="w-8 h-8 flex-shrink-0" />}

                                    <div>
                                        <h4 className="font-bold text-lg">{scanResult.message}</h4>
                                        {scanResult.userName && <p className="text-sm font-medium">{scanResult.userName}</p>}
                                    </div>
                                </div>
                            )}

                            <div id="reader" className="w-full bg-white rounded overflow-hidden shadow-inner min-h-[300px]"></div>

                            <div className="mt-4 text-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setScanResult({ status: 'idle' })}
                                    className="w-full"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    รีเซ็ตและสแกนต่อ
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
