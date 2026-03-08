import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Disc, LayoutGrid, Trophy, Puzzle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import wheelCardBg from '@/components/minigames/wheel/spinwheel_banner.jpg';
import matchCardBg from '@/components/minigames/match/memorymatchgame_banner.jpg';

export default function GameHub() {
    const games = [
        {
            id: 'wheel',
            title: 'เกมหมุนวงล้อ (Spin Wheel)',
            description: 'ลุ้นรับรางวัลมากมายทุกวัน',
            icon: Disc,
            color: 'text-rose-500',
            bgColor: 'bg-rose-100',
            link: '/games/wheel',
            isReady: true,
            bgImage: wheelCardBg,
            customFont: 'font-mali text-stroke-white',
        },
        {
            id: 'match',
            title: 'เกมจับคู่ภาพ',
            description: 'ประลองความจำ แลกรับคะแนน',
            icon: LayoutGrid,
            color: 'text-blue-500',
            bgColor: 'bg-blue-100',
            link: '/games/match',
            isReady: true,
            bgImage: matchCardBg,
        },
        {
            id: 'game3',
            title: 'เกมปริศนา (เร็วๆนี้)',
            description: 'ท้าทายสมองกับเกมไขปริศนา',
            icon: Puzzle,
            color: 'text-gray-400',
            bgColor: 'bg-gray-100',
            link: '#',
            isReady: false,
        },
        {
            id: 'game4',
            title: 'เกมพิเศษ (เร็วๆนี้)',
            description: 'เตรียมพบกับเกมใหม่สุดท้าทาย',
            icon: Trophy,
            color: 'text-gray-400',
            bgColor: 'bg-gray-100',
            link: '#',
            isReady: false,
        }
    ];

    return (
        <div className="container max-w-lg mx-auto p-4 pb-24 space-y-6">
            <header className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
                    <Gamepad2 className="w-8 h-8" />
                    ศูนย์รวมความสนุก
                </h1>
                <p className="text-muted-foreground mt-1">
                    เล่นเกมสะสมคะแนน แลกของรางวัลสุดคุ้ม
                </p>
                <style>{`
                    .text-stroke-white {
                        -webkit-text-stroke: 1px white;
                        text-shadow: 0px 2px 4px rgba(0,0,0,0.3);
                    }
                `}</style>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {games.map((game) => {
                    const CardWrapper = game.isReady ? Link : 'div';

                    return (
                        <CardWrapper
                            key={game.id}
                            to={game.link}
                            className={`block relative transition-all duration-300 rounded-xl overflow-hidden ${game.isReady ? 'hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] hover:-translate-y-2 active:scale-95 active:-translate-y-0 active:shadow-md' : 'opacity-80 grayscale-[50%]'}`}
                        >
                            <Card className={`h-full border-2 border-transparent hover:border-primary/20 overflow-hidden bg-white ${game.bgImage ? 'border-none shadow-xl shadow-black/5' : ''}`}>
                                {game.bgImage ? (
                                    <div className="relative w-full overflow-hidden bg-transparent flex items-center justify-center group">
                                        <img
                                            src={game.bgImage}
                                            alt={game.title}
                                            className="w-full h-auto object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                            <div className={`p-3 rounded-full ${game.bgColor} ${game.color}`}>
                                                <game.icon className="w-6 h-6" />
                                            </div>
                                            {!game.isReady && (
                                                <Badge variant="secondary" className="font-normal text-xs bg-gray-200 text-gray-600">
                                                    เร็วๆนี้
                                                </Badge>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <CardTitle className="text-lg mb-1">{game.title}</CardTitle>
                                            <CardDescription>{game.description}</CardDescription>
                                        </CardContent>
                                    </>
                                )}
                            </Card>
                        </CardWrapper>
                    );
                })}
            </div>
        </div>
    );
}
