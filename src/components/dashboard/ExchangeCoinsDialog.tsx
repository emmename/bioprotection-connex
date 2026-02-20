import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Coins, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import congratulationsImage from '@/assets/19.png';

interface ExchangeCoinsDialogProps {
    currentCoins: number;
    onExchangeSuccess: () => void;
    trigger?: React.ReactNode;
}

export function ExchangeCoinsDialog({ currentCoins, onExchangeSuccess, trigger }: ExchangeCoinsDialogProps) {
    const [open, setOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [amount, setAmount] = useState<number | string>("");
    const [exchangeRate, setExchangeRate] = useState(10); // Coins per 1 Point
    const [isActive, setIsActive] = useState(true);
    const [minCoins, setMinCoins] = useState(100);
    const [isLoadingRate, setIsLoadingRate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [earnedPoints, setEarnedPoints] = useState(0);

    useEffect(() => {
        if (open) {
            fetchExchangeSettings();
        }
    }, [open]);

    const fetchExchangeSettings = async () => {
        setIsLoadingRate(true);
        try {
            const { data, error } = await supabase
                // @ts-expect-error system_settings table not in generated types
                .from("system_settings")
                .select("*");

            if (error) {
                console.error("Error fetching settings:", error);
            }

            if (data) {
                // @ts-expect-error data shape from system_settings
                const settings = data as { key: string, value: string }[];
                const rate = settings.find(s => s.key === 'coins_per_point');
                const active = settings.find(s => s.key === 'exchange_is_active');
                const min = settings.find(s => s.key === 'exchange_min_coins');

                if (rate) setExchangeRate(parseInt(rate.value) || 10);
                if (active) setIsActive(active.value === 'true');
                if (min) setMinCoins(parseInt(min.value) || 100);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoadingRate(false);
        }
    };

    const handleExchange = async () => {
        const coinsToExchange = typeof amount === 'string' ? parseInt(amount) : amount;

        if (!coinsToExchange || coinsToExchange <= 0) {
            toast.error("กรุณาระบุจำนวนเหรียญที่ถูกต้อง");
            return;
        }

        if (coinsToExchange < minCoins) {
            toast.error(`ต้องแลกขั้นต่ำ ${minCoins} เหรียญ`);
            return;
        }

        if (coinsToExchange > currentCoins) {
            toast.error("เหรียญของคุณไม่พอ");
            return;
        }

        setIsSubmitting(true);
        try {
            // @ts-expect-error exchange_coins_to_points RPC not in generated types
            const { data, error } = await supabase.rpc('exchange_coins_to_points', {
                p_amount: coinsToExchange
            });

            if (error) throw error;

            // @ts-expect-error data shape from RPC call
            if (data && data.success) {
                // @ts-expect-error data.points_received from RPC
                const points = data.points_received || Math.floor(coinsToExchange / exchangeRate);
                setEarnedPoints(points);
                setOpen(false);
                setAmount("");
                setSuccessOpen(true); // Open success modal
                // onExchangeSuccess(); // Moved to Success Modal OK button
            } else {
                // @ts-expect-error data.message from RPC response
                toast.error(data?.message || "เกิดข้อผิดพลาดในการแลกคะแนน");
            }
        } catch (error) {
            console.error("Exchange error:", error);
            toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculatePoints = () => {
        const val = typeof amount === 'string' ? parseInt(amount) : amount;
        if (!val) return 0;
        return Math.floor(val / exchangeRate); // Format: Coins / Rate
    };

    // Pre-defined buttons
    const setMax = () => setAmount(currentCoins);

    const handleSuccessClose = () => {
        setSuccessOpen(false);
        onExchangeSuccess(); // Refresh data/page only after user acknowledges
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" size="sm" className="gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            แลกคะแนน
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Coins className="h-6 w-6 text-amber-500" />
                            แลกเหรียญเป็นคะแนน
                        </DialogTitle>
                        <DialogDescription>
                            {isActive
                                ? `อัตราแลกเปลี่ยน: ${exchangeRate} เหรียญ = 1 คะแนน`
                                : <span className="text-red-500 font-medium">ระบบแลกคะแนนปิดปรับปรุงชั่วคราว</span>
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {isActive ? (
                        <div className="space-y-6 py-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <Label>จำนวนเหรียญที่ต้องการแลก (ขั้นต่ำ {minCoins})</Label>
                                    <span className="text-muted-foreground">มีอยู่: {currentCoins.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            className="pl-9"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min={minCoins}
                                            max={currentCoins}
                                        />
                                    </div>
                                    <Button variant="secondary" onClick={setMax} type="button">
                                        สูงสุด
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-4 text-muted-foreground bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-foreground">{(typeof amount === 'string' ? parseInt(amount) || 0 : amount).toLocaleString()}</div>
                                    <div className="text-xs">เหรียญ</div>
                                </div>
                                <ArrowRight className="h-6 w-6" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{calculatePoints().toLocaleString()}</div>
                                    <div className="text-xs">คะแนน</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                            <Zap className="h-12 w-12 text-gray-300" />
                            <p>ขออภัย ระบบแลกคะแนนปิดปรับปรุงชั่วคราว</p>
                            <p className="text-sm">โปรดกลับมาใช้บริการใหม่ในภายหลัง</p>
                        </div>
                    )}

                    <DialogFooter className="sm:justify-between">
                        <div className="text-xs text-muted-foreground flex items-center">
                            {isLoadingRate ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {isLoadingRate ? "กำลังโหลดข้อมูล..." : ""}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                                {isActive ? 'ยกเลิก' : 'ปิด'}
                            </Button>
                            {isActive && (
                                <Button onClick={handleExchange} disabled={isSubmitting || (typeof amount === 'string' ? parseInt(amount) : amount) < minCoins || isLoadingRate}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    ยืนยันการแลก
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={successOpen} onOpenChange={handleSuccessClose}>
                <DialogContent className="sm:max-w-md text-center">
                    <div className="flex flex-col items-center justify-center py-6 gap-4">
                        <img
                            src={congratulationsImage}
                            alt="Congratulations"
                            className="w-48 h-auto object-contain animate-bounce-in"
                        />
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-primary">แลกคะแนนสำเร็จ!</h2>
                            <p className="text-muted-foreground">
                                คุณได้รับ <span className="text-amber-500 font-bold text-xl">{earnedPoints.toLocaleString()}</span> คะแนน
                            </p>
                        </div>
                        <Button onClick={handleSuccessClose} className="w-full mt-4">
                            ตกลง
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
