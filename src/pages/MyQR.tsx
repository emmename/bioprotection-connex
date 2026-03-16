import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, User } from 'lucide-react';
import QRCode from 'react-qr-code';
import { PageHeader } from '@/components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';

export default function MyQR() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [qrValue, setQrValue] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        if (!profile?.id) return;

        const updateQr = () => {
            setQrValue(JSON.stringify({
                p: profile.id,
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
    }, [profile?.id]);

    if (!profile) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'สมาชิก';

    return (
        <div className="min-h-screen bg-background pb-24">
            <PageHeader title="QR ของฉัน" onBack={() => navigate(-1)} />

            <main className="container max-w-md mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="overflow-hidden border-2 border-primary">
                    <div className="h-2 bg-primary" />
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold text-slate-800">QR Code ของฉัน</CardTitle>
                        <CardDescription className="text-slate-600">
                            แสดง QR Code นี้แก่เจ้าหน้าที่เพื่อเช็คอินเข้างาน
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-inner flex flex-col items-center justify-center">
                            <div className="p-4 bg-white border-4 border-slate-100 rounded-xl relative">
                                {/* Background pattern for qr code area */}
                                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

                                <div className="relative z-10">
                                    <QRCode
                                        value={qrValue || profile.id}
                                        size={200}
                                        viewBox={`0 0 200 200`}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        level="H"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 w-full max-w-[200px] text-center space-y-2">
                                <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm bg-primary/10 rounded-full py-1.5 px-3">
                                    <Clock className="w-4 h-4" />
                                    QR Code อัปเดตใน {timeLeft} วิ
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    ห้ามแคปหน้าจอเพื่อป้องกันการสวมสิทธิ์
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{displayName}</p>
                                    <p className="text-xs text-slate-500">
                                        {profile.member_type || 'สมาชิก'} • {profile.tier || 'Standard'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center pt-4">
                    <p className="text-xs text-muted-foreground">
                        หากพบปัญหาในการเช็คอิน โปรดติดต่อเจ้าหน้าที่ดูแลกิจกรรม
                    </p>
                </div>
            </main>
        </div>
    );
}
