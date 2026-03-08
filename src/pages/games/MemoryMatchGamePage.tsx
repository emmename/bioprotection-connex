import { MemoryMatchGame } from "@/components/minigames/match/MemoryMatchGame";

const MemoryMatchGamePage = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <main className="flex-1 flex">
                <MemoryMatchGame />
            </main>
        </div>
    );
};

export default MemoryMatchGamePage;
