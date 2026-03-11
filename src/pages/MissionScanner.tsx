import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useQRScan } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';

export default function MissionScanner() {
    const navigate = useNavigate();
    const { scanQR, isScanning } = useQRScan();

    const [scanResult, setScanResult] = useState<{
        status: 'success' | 'error' | 'already_completed' | 'idle';
        message?: string;
        pointsObj?: { points: number, coins: number };
    }>({ status: 'idle' });

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
        const scanner = new Html5QrcodeScanner(
            "mission-reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                videoConstraints: { facingMode: "environment" }
            },
            false
        );

        const onScanSuccess = async (decodedText: string) => {
            if (!isScanning && scanResult.status === 'idle') {
                try {
                    const result = await scanQR(decodedText);
                    
                    if (result?.success) {
                        setScanResult({
                            status: 'success',
                            message: result.message,
                            pointsObj: { points: result.points_awarded || 0, coins: result.coins_awarded || 0 }
                        });
                        playBeep(800);
                        toast.success('ทำภารกิจสำเร็จ!');
                    } else if (result?.message?.includes('ไปแล้ว')) {
                        setScanResult({
                            status: 'already_completed',
                            message: result.message
                        });
                        playBeep(500);
                        toast.error(result.message);
                    } else {
                        setScanResult({
                            status: 'error',
                            message: result?.message || 'สแกนไม่สำเร็จ'
                        });
                        playBeep(300);
                        toast.error(result?.message || 'QR Code ไม่ถูกต้อง');
                    }
                } catch (e: any) {
                    setScanResult({
                        status: 'error',
                        message: e.message || 'เกิดข้อผิดพลาดในการตรวจสอบระบบ'
                    });
                    playBeep(300);
                }

                // Auto reset status after 5 seconds to scan more things if they want
                setTimeout(() => {
                    setScanResult({ status: 'idle' });
                }, 5000);
            }
        };

        const onScanFailure = (error: any) => {
            // Ignored to prevent spamming
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear scanner. ", error);
            });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanning, scanResult.status]);

    return (
        <div className="min-h-screen bg-background pb-24">
            <PageHeader title="สแกนทำภารกิจ" onBack={() => navigate('/missions')} />
            
            <div className="container mx-auto px-4 pt-6 max-w-lg space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl text-center">สแกน QR Code</CardTitle>
                        <CardDescription className="text-center">หากล้องของคุณไปที่ QR Code ของภารกิจ</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                        {scanResult.status !== 'idle' && (
                            <div className={`p-4 rounded-lg flex items-center gap-3 shadow-sm ${
                                scanResult.status === 'success' ? 'bg-green-100 border border-green-300 text-green-800' :
                                scanResult.status === 'already_completed' ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' :
                                'bg-red-100 border border-red-300 text-red-800'
                            }`}>
                                {scanResult.status === 'success' && <CheckCircle2 className="w-8 h-8 flex-shrink-0" />}
                                {scanResult.status === 'already_completed' && <AlertCircle className="w-8 h-8 flex-shrink-0" />}
                                {scanResult.status === 'error' && <XCircle className="w-8 h-8 flex-shrink-0" />}

                                <div>
                                    <h4 className="font-bold text-lg">{scanResult.message}</h4>
                                    {scanResult.status === 'success' && scanResult.pointsObj && (
                                        <p className="text-sm font-medium">ได้รับ {scanResult.pointsObj.points} แต้ม / {scanResult.pointsObj.coins} เหรียญ</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div id="mission-reader" className="w-full bg-slate-50 rounded overflow-hidden shadow-inner min-h-[300px] border-2 border-primary/20 border-dashed"></div>

                        <div className="mt-4 text-center">
                            <Button
                                variant="outline"
                                onClick={() => setScanResult({ status: 'idle' })}
                                className="w-full"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                สแกนใหม่
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
