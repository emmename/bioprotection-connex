import { WheelGame } from "@/components/minigames/wheel/WheelGame";
import { ChevronLeft, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const WheelGamePage = () => {
    const navigate = useNavigate();
    const [showInstructions, setShowInstructions] = useState(false);

    return (
        <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-black">
            {/* Floating Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-50 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all active:scale-95 border border-white/20 shadow-lg"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Info Button */}
            <button
                onClick={() => setShowInstructions(true)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all active:scale-95 border border-white/20 shadow-lg"
            >
                <Info className="w-6 h-6" />
            </button>

            <WheelGame />

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 px-4">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-90 duration-300">
                        <div className="flex justify-between items-center p-4 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">วิธีการเล่น</h2>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="p-1 rounded-full hover:bg-white/10 text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-white text-sm space-y-4">
                            <ul className="list-disc pl-5 space-y-3 text-gray-200">
                                <li><strong>กดปุ่ม "หมุนเลย"</strong> เพื่อหมุนวงล้อลุ้นรางวัล</li>
                                <li>ในแต่ละรอบอาจใช้ระบุสิทธิ์หมุนฟรี (ถ้ามี) หรือต้องใช้เหรียญที่คุณสะสมไว้ในการหมุน</li>
                                <li>เมื่อวงล้อหยุด หากเข็มชี้ไปที่ช่องที่มีรางวัล คุณจะได้รับรางวัลนั้นทันที</li>
                                <li>ของรางวัลจะถูกโอนเข้าสู่ระบบโดยอัตโนมัติ </li>
                                <li>อย่าลืมสะสมเหรียญไว้เยอะๆ เพื่อมาหมุนรับของรางวัลกันนะ!</li>
                            </ul>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform active:scale-95"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WheelGamePage;
