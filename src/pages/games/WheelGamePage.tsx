import { WheelGame } from "@/components/minigames/wheel/WheelGame";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WheelGamePage = () => {
    const navigate = useNavigate();

    return (
        <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-black">
            {/* Floating Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-50 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all active:scale-95 border border-white/20 shadow-lg"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            <WheelGame />
        </div>
    );
};

export default WheelGamePage;
