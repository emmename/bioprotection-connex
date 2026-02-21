import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ComingSoon() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-sm w-full animate-slide-up space-y-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-12 h-12 text-primary" />
                </div>

                <h1 className="text-2xl font-bold text-foreground">
                    ขออภัย หน้านี้ยังไม่เปิดให้บริการ
                </h1>

                <p className="text-muted-foreground text-sm leading-relaxed">
                    ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา <br /> พบกันเร็วๆ นี้!
                </p>

                <div className="pt-8">
                    <Button
                        onClick={() => navigate(-1)}
                        className="w-full gradient-primary text-white font-medium h-12 rounded-xl text-base shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> ย้อนกลับ
                    </Button>
                </div>
            </div>
        </div>
    );
}
