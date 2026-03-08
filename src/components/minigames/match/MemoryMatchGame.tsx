import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, Play, RefreshCw, Trophy, HelpCircle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import cardBackLogo from '@/assets/bioprotection-logo_256.png';
import winImage from '@/assets/13.png';
import loseImage from '@/assets/16.png';
import gameBg from '@/components/minigames/match/memorymatch_bg.jpg';

interface MatchLevel {
    grid: [number, number];
    time: number;
}

interface MatchConfig {
    id: string;
    config_name: string;
    coins_cost: number;
    free_plays_per_day: number;
    reward_type: string;
    reward_value: number;
    levels_config: MatchLevel[];
}

interface MatchImage {
    id: string;
    image_url: string;
}

interface CardType {
    id: string;
    imageUrl: string;
    isFlipped: boolean;
    isMatched: boolean;
}

export const MemoryMatchGame = () => {
    const { session } = useAuth();
    const [config, setConfig] = useState<MatchConfig | null>(null);
    const [images, setImages] = useState<MatchImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Game State
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
    const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
    const [cards, setCards] = useState<CardType[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [userCoins, setUserCoins] = useState<number>(0);
    const [playedToday, setPlayedToday] = useState(0);
    const navigate = useNavigate();

    // Sound effects using Web Audio API
    const playSound = (freq: number, dur: number, type: OscillatorType = 'sine') => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = type;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
            osc.start();
            osc.stop(ctx.currentTime + dur);
        } catch (e) { /* ignore */ }
    };
    const playFlipSound = () => playSound(800, 0.1);
    const playMatchSound = () => { playSound(523, 0.15); setTimeout(() => playSound(659, 0.15), 100); setTimeout(() => playSound(784, 0.2), 200); };
    const playWinSound = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playSound(f, 0.3), i * 150)); };
    const playLoseSound = () => { playSound(300, 0.3, 'sawtooth'); setTimeout(() => playSound(200, 0.5, 'sawtooth'), 200); };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                // Fetch config
                const { data: configData, error: configError } = await (supabase as any)
                    .from('match_configs')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (configError) throw configError;

                // Fetch images
                const { data: imgData, error: imgError } = await (supabase as any)
                    .from('match_images')
                    .select('id, image_url')
                    .eq('is_active', true);

                if (imgError) throw imgError;

                if (configData && (!configData.levels_config || configData.levels_config.length === 0)) {
                    configData.levels_config = [{ grid: [2, 3], time: 30 }];
                }

                setConfig(configData);
                setImages(imgData || []);

                // Fetch user coins & play count
                if (session?.user?.id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, total_coins')
                        .eq('user_id', session.user.id)
                        .single();
                    if (profile) {
                        setUserCoins(profile.total_coins || 0);
                        const startOfDay = new Date();
                        startOfDay.setHours(0, 0, 0, 0);
                        const { count } = await (supabase as any)
                            .from('game_sessions')
                            .select('*', { count: 'exact', head: true })
                            .eq('profile_id', profile.id)
                            .eq('game_type', 'memory_match')
                            .gte('played_at', startOfDay.toISOString());
                        setPlayedToday(count || 0);
                    }
                }
            } catch (error) {
                console.error("Error loading game data", error);
                toast.error("ไม่สามารถโหลดข้อมูลเกมได้");
            } finally {
                setIsLoading(false);
            }
        };

        init();
        return () => stopTimer();
    }, []);

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startTimer = (duration: number) => {
        stopTimer();
        setTimeLeft(duration);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const generateLevel = (levelIdx: number, bonusTime?: number) => {
        if (!config || images.length === 0) return;

        const levelConfig = config.levels_config[levelIdx];
        const [cols, rows] = levelConfig.grid;
        let totalCards = cols * rows;

        // If odd number of cards, we need to hide one (math trick for 3x3)
        // Usually, memory match needs an even number. We just use the even floor.
        const totalPairs = Math.floor(totalCards / 2);
        const actualCardsToPlay = totalPairs * 2;

        // Select random images for pairs
        const selectedPairs: string[] = [];
        for (let i = 0; i < totalPairs; i++) {
            // Pick a random image from available images (can repeat if fewer images than pairs)
            const randomImg = images[Math.floor(Math.random() * images.length)];
            selectedPairs.push(randomImg.image_url);
        }

        // Create full deck (2 of each)
        const newDeck: CardType[] = [];
        selectedPairs.forEach((url, i) => {
            newDeck.push({ id: `p${i}-a`, imageUrl: url, isFlipped: false, isMatched: false });
            newDeck.push({ id: `p${i}-b`, imageUrl: url, isFlipped: false, isMatched: false });
        });

        // Add a dummy card if grid size is odd (e.g., 3x3 = 9 cards, 4 pairs + 1 dummy)
        if (totalCards > actualCardsToPlay) {
            newDeck.push({
                id: 'dummy',
                imageUrl: 'dummy', // special marker
                isFlipped: true, // Always flipped or hidden
                isMatched: true  // Already "matched" so it doesn't count
            });
        }

        // Shuffle deck
        const shuffled = newDeck.sort(() => Math.random() - 0.5);

        setCards(shuffled);
        setFlippedIndices([]);
        setIsChecking(false);
        setGameState('playing');
        startTimer(levelConfig.time + (bonusTime || 0));
    };

    const handleStartGame = async () => {
        if (!config || images.length < 1) {
            toast.error("เกมยังไม่พร้อมให้บริการ");
            return;
        }

        if (!session?.user?.id) {
            toast.error("กรุณาเข้าสู่ระบบก่อนเล่นเกม");
            return;
        }

        try {
            // Step 1: Get user profile
            console.log("[MatchGame] Step 1: Fetching profile...");
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

            if (profileError) {
                console.error("[MatchGame] Profile error:", profileError);
                throw profileError;
            }
            if (!profile) throw new Error("Profile not found");
            console.log("[MatchGame] Profile found:", profile.id);

            // Step 2: Count plays today (non-fatal if fails — default to free play)
            console.log("[MatchGame] Step 2: Counting today's plays...");
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            let playedToday = 0;
            try {
                const { count, error: countError } = await (supabase as any)
                    .from('game_sessions')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', profile.id)
                    .eq('game_type', 'memory_match')
                    .gte('played_at', startOfDay.toISOString());

                if (!countError) {
                    playedToday = count || 0;
                } else {
                    console.warn("[MatchGame] Count query failed, defaulting to free play:", countError);
                }
            } catch (e) {
                console.warn("[MatchGame] Count query exception, defaulting to free play:", e);
            }

            const isFreePlay = playedToday < (config.free_plays_per_day || 0);
            const cost = config.coins_cost || 0;
            console.log("[MatchGame] playedToday:", playedToday, "isFreePlay:", isFreePlay, "cost:", cost);

            if (!isFreePlay && profile.total_coins < cost) {
                toast.error(`เหรียญไม่เพียงพอ (ต้องการ ${cost} เหรียญ)`);
                return;
            }

            // Step 3: Deduct coins if not free play (uses player-safe RPC)
            if (!isFreePlay && cost > 0) {
                console.log("[MatchGame] Step 3: Deducting coins...");
                const { error: deductError } = await (supabase as any).rpc('spend_coins_for_game', {
                    p_profile_id: profile.id,
                    p_amount: cost,
                    p_game_type: 'memory_match',
                    p_description: 'เล่นเกมจับคู่ภาพ'
                });
                if (deductError) {
                    console.error("[MatchGame] Deduct error:", deductError);
                    throw deductError;
                }
                setUserCoins(prev => prev - cost);
            }
            setPlayedToday(prev => prev + 1);

            console.log("[MatchGame] All checks passed, starting game!");
            setCurrentLevelIdx(0);
            generateLevel(0);
        } catch (error) {
            console.error("[MatchGame] Failed to start game:", error);
            toast.error("ไม่สามารถเริ่มเกมได้ กรุณาลองใหม่");
        }
    };

    const handleTimeOut = () => {
        setGameState('lost');
        playLoseSound();
        toast.error("หมดเวลา! คุณแพ้แล้ว");
        recordGameSession('lost', null);
    };

    const recordGameSession = async (status: 'completed' | 'lost', rewardValue: number | null) => {
        if (!session?.user?.id) return;

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', session.user.id)
                .single();

            if (!profile) return;

            // Match WheelGame pattern: use status and reward_id columns
            await (supabase as any).from('game_sessions').insert({
                profile_id: profile.id,
                game_type: 'memory_match',
                status: status,
            });
        } catch (e) {
            console.error("Failed to record session", e);
        }
    };

    const checkWinCondition = (currentCards: CardType[]) => {
        // Exclude dummy cards if any
        const playingCards = currentCards.filter(c => c.id !== 'dummy');
        if (playingCards.every(c => c.isMatched)) {
            stopTimer();
            if (currentLevelIdx < (config?.levels_config.length || 0) - 1) {
                // Next level
                playMatchSound();
                setTimeout(() => {
                    const remainingTime = timeLeft;
                    setCurrentLevelIdx(prev => prev + 1);
                    generateLevel(currentLevelIdx + 1, remainingTime);
                }, 1000);
                toast.success(`ผ่านเลเวล ${currentLevelIdx + 1}! เวลาเหลือ +${timeLeft}s ⏱️`);
            } else {
                // Won the whole game
                playWinSound();
                setGameState('won');
                handleWinReward();
            }
        }
    };

    const handleWinReward = async () => {
        if (!config || !session?.user?.id) return;

        await recordGameSession('completed', config.reward_value);

        if (config.reward_type !== 'none' && config.reward_value > 0) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .single();

                if (!profile) return;

                if (config.reward_type === 'points') {
                    const { error } = await supabase.rpc('add_points', {
                        p_profile_id: profile.id,
                        p_amount: config.reward_value,
                        p_source: 'game',
                        p_description: `ชนะเกมจับคู่ภาพ`
                    });
                    if (error) throw error;
                    toast.success(`ยินดีด้วย! คุณได้รับ ${config.reward_value} แต้ม`);
                } else if (config.reward_type === 'coins') {
                    const { error } = await supabase.rpc('add_coins', {
                        p_profile_id: profile.id,
                        p_amount: config.reward_value,
                        p_source: 'game',
                        p_description: `ชนะเกมจับคู่ภาพ`
                    });
                    if (error) throw error;
                    setUserCoins(prev => prev + config.reward_value);
                    toast.success(`ยินดีด้วย! คุณได้รับ ${config.reward_value} เหรียญ`);
                }
            } catch (e) {
                console.error("Error giving reward:", e);
                toast.error("เกิดข้อผิดพลาดในการรับรางวัล");
            }
        } else {
            toast.success("ยินดีด้วย! คุณชนะแล้ว (ไม่มีรางวัลสำหรับแผนนี้)");
        }
    };

    const handleCardClick = (index: number) => {
        if (gameState !== 'playing' || isChecking || cards[index].isFlipped || cards[index].isMatched || cards[index].id === 'dummy') {
            return;
        }

        playFlipSound();
        const newFlippedIndices = [...flippedIndices, index];
        const newCards = [...cards];
        newCards[index].isFlipped = true;

        setCards(newCards);
        setFlippedIndices(newFlippedIndices);

        if (newFlippedIndices.length === 2) {
            setIsChecking(true);
            const [firstIndex, secondIndex] = newFlippedIndices;

            if (newCards[firstIndex].imageUrl === newCards[secondIndex].imageUrl) {
                // Match
                setTimeout(() => {
                    playMatchSound();
                    const matchedCards = [...newCards];
                    matchedCards[firstIndex].isMatched = true;
                    matchedCards[secondIndex].isMatched = true;
                    setCards(matchedCards);
                    setFlippedIndices([]);
                    setIsChecking(false);
                    checkWinCondition(matchedCards);
                }, 500);
            } else {
                // No Match
                setTimeout(() => {
                    const resetCards = [...newCards];
                    resetCards[firstIndex].isFlipped = false;
                    resetCards[secondIndex].isFlipped = false;
                    setCards(resetCards);
                    setFlippedIndices([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    };

    if (isLoading) {
        return <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!config) {
        return <div className="text-center py-10 text-muted-foreground">เกมปิดปรับปรุงอยู่ชั่วคราว</div>;
    }

    // Grid layout string generation
    const currentConfig = config.levels_config[currentLevelIdx];
    const gridCols = currentConfig ? currentConfig.grid[0] : 4;
    const gridRows = currentConfig ? currentConfig.grid[1] : 3;
    const isFreePlayAvailable = playedToday < (config.free_plays_per_day || 0);
    const canAfford = isFreePlayAvailable || userCoins >= config.coins_cost;
    const rewardTypeLabel = config.reward_type === 'coins' ? 'เหรียญ' : config.reward_type === 'points' ? 'แต้ม' : '';

    // Calculate dynamic gap based on grid size for mobile fit
    const gapSize = gridCols >= 6 ? 2 : gridCols >= 4 ? 3 : 4;
    const gridPadding = gapSize + 2;

    // Calculate card size to fit within the game zone (middle ~50% of screen)
    // Top ~25% is sky/banner, middle ~60% is green field (card area), bottom ~15% is chickens
    const gameZoneHeight = `calc(100dvh * 0.60)`;
    const topZoneHeight = `calc(100dvh * 0.25)`;
    const bottomZoneHeight = `calc(100dvh * 0.15)`;

    const availableHeight = `calc(${gameZoneHeight} - ${gridPadding * 2}px - ${(gridRows - 1) * gapSize}px)`;
    const availableWidth = `calc(min(100vw, 448px) - 16px - ${gridPadding * 2}px - ${(gridCols - 1) * gapSize}px)`;
    const cardWidthFromHeight = `calc(${availableHeight} / ${gridRows} * 2 / 3)`;
    const cardWidthFromWidth = `calc(${availableWidth} / ${gridCols})`;
    const cardWidth = `min(${cardWidthFromHeight}, ${cardWidthFromWidth})`;

    return (
        <div className="relative w-full max-w-md mx-auto overflow-hidden" style={{ height: '100dvh', backgroundImage: `url(${gameBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            {/* Back button */}
            <button onClick={() => navigate('/games')} className="absolute top-3 left-3 z-20 p-1.5 bg-black/20 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-black/30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Floating header info — just below the airplane banner, right-aligned */}
            <div className="absolute right-2 z-10 flex items-center gap-3 px-3 py-1.5 bg-black/20 backdrop-blur-sm rounded-lg" style={{ top: '14%' }}>
                <div>
                    {gameState === 'playing' && (
                        <p className="text-xs text-white/80 font-medium">Level {currentLevelIdx + 1} / {config.levels_config.length}</p>
                    )}
                </div>
                <div className="text-right">
                    {gameState === 'playing' ? (
                        <div className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 font-semibold text-white/90 text-sm">
                            <Coins className="w-4 h-4 text-amber-300" />
                            {userCoins} เหรียญ
                        </div>
                    )}
                </div>
            </div>

            {/* Game Area — positioned in the green field zone */}
            <div className="absolute left-0 right-0 flex items-center justify-center px-2" style={{ top: topZoneHeight, height: gameZoneHeight }}>
                {gameState === 'idle' && (
                    <div className="flex flex-col items-center justify-center space-y-3 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-6 text-center shadow-lg mx-auto max-w-xs">
                        <Button size="lg" className="w-52 h-12 text-base rounded-xl shadow-lg hover:scale-105 transition-transform" onClick={handleStartGame} disabled={!canAfford}>
                            <Play className="w-5 h-5 mr-2" />
                            {isFreePlayAvailable ? 'เริ่มเล่นเกม (ฟรี!)' : <>เริ่มเล่นเกม ({config.coins_cost} <Coins className="w-4 h-4 mx-0.5" />)</>}
                        </Button>
                        <p className="text-xs text-slate-500">{!canAfford ? '❌ เหรียญไม่เพียงพอ' : 'จับคู่ภาพทั้งหมดให้ทันเวลา!'}</p>

                        {showHelp ? (
                            <div className="bg-slate-50 rounded-lg p-3 text-left space-y-1.5 text-xs text-slate-600 border border-slate-200 w-full">
                                <p className="font-semibold text-slate-700 text-sm">📖 วิธีเล่น</p>
                                <p>🃏 แตะการ์ดเพื่อเปิดดูรูปภาพ</p>
                                <p>🔍 จำตำแหน่งภาพแล้วหาคู่ที่เหมือนกัน</p>
                                <p>⏱️ จับคู่ให้ครบก่อนหมดเวลา</p>
                                <p>⭐ เวลาที่เหลือจะบวกเพิ่มในด่านถัดไป</p>
                                <button onClick={() => setShowHelp(false)} className="text-primary font-medium mt-1 hover:underline">ปิด</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors">
                                <HelpCircle className="w-4 h-4" />
                                วิธีเล่น
                            </button>
                        )}
                    </div>
                )}

                {gameState === 'lost' && (
                    <div className="flex flex-col items-center justify-center space-y-3 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-6 text-center shadow-lg mx-auto">
                        <img src={loseImage} alt="เสียใจ" className="w-28 h-28 object-contain" />
                        <h3 className="text-xl font-bold text-slate-800">เสียใจด้วย หมดเวลาแล้ว!</h3>
                        <p className="text-slate-500 text-sm">ไม่เป็นไร ลองใหม่ได้เลย สู้ ๆ นะ! 💪</p>
                        <Button size="default" className="w-full max-w-[220px]" onClick={handleStartGame} disabled={!canAfford}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isFreePlayAvailable ? 'ลองใหม่อีกครั้ง (ฟรี!)' : <>ลองใหม่อีกครั้ง ({config.coins_cost} <Coins className="w-3.5 h-3.5 mx-0.5" />)</>}
                        </Button>
                    </div>
                )}

                {gameState === 'won' && (
                    <div className="flex flex-col items-center justify-center space-y-3 bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200 p-6 text-center shadow-lg mx-auto">
                        <img src={winImage} alt="ยินดีด้วย" className="w-28 h-28 object-contain animate-bounce" />
                        <h3 className="text-xl font-bold text-slate-800">🎉 ยินดีด้วย คุณชนะ!</h3>

                        {config.reward_type !== 'none' && config.reward_value > 0 && (
                            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                <span className="font-semibold text-amber-800">ได้รับรางวัล:</span>
                                <span className="text-amber-600 font-black">{config.reward_value} {rewardTypeLabel}</span>
                            </div>
                        )}

                        <Button size="default" className="w-full max-w-[220px] mt-2" onClick={handleStartGame} disabled={!canAfford}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isFreePlayAvailable ? 'เล่นอีกครั้ง (ฟรี!)' : <>เล่นอีกครั้ง ({config.coins_cost} <Coins className="w-3.5 h-3.5 mx-0.5" />)</>}
                        </Button>
                    </div>
                )}

                {/* Game Grid — dynamically sized to fit viewport */}
                {gameState === 'playing' && (
                    <div
                        className="grid bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 shadow-sm place-items-center"
                        style={{
                            gridTemplateColumns: `repeat(${gridCols}, ${cardWidth})`,
                            gap: `${gapSize}px`,
                            padding: `${gridPadding}px`,
                        }}
                    >
                        {cards.map((card, index) => {
                            if (card.id === 'dummy') {
                                return <div key={`dummy-${index}`} className="opacity-0 pointer-events-none" style={{ width: cardWidth, aspectRatio: '2/3' }} />;
                            }

                            return (
                                <div
                                    key={`${card.id}-${index}`}
                                    className="relative cursor-pointer group"
                                    onClick={() => handleCardClick(index)}
                                    style={{ perspective: '600px', width: cardWidth, aspectRatio: '2/3' }}
                                >
                                    <div
                                        className="w-full h-full relative duration-500 ease-in-out"
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: card.isFlipped || card.isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                        }}
                                    >
                                        {/* Front side (card back with pattern) */}
                                        <div
                                            className="absolute inset-0 w-full h-full rounded-md shadow-sm border border-primary/30 transition-transform group-hover:scale-[1.03] overflow-hidden"
                                            style={{ backfaceVisibility: 'hidden' }}
                                        >
                                            {/* Gradient base */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
                                            {/* Diamond pattern overlay */}
                                            <div className="absolute inset-0 card-pattern opacity-20" />
                                            {/* Inner border frame */}
                                            <div className="absolute inset-[3px] rounded border border-white/30" />
                                            <div className="absolute inset-[6px] rounded border border-white/15" />
                                            {/* Center logo */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <img src={cardBackLogo} alt="" className="w-[50%] h-[50%] object-contain opacity-80 drop-shadow-sm" />
                                            </div>
                                        </div>

                                        {/* Back side (the actual image) */}
                                        <div
                                            className="absolute inset-0 w-full h-full bg-white rounded-md shadow-sm overflow-hidden border border-slate-200"
                                            style={{
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)'
                                            }}
                                        >
                                            <div
                                                className={`w-full h-full transition-all duration-500 ${card.isMatched ? 'opacity-40 grayscale saturate-50' : 'opacity-100'}`}
                                                style={{
                                                    backgroundImage: `url(${card.imageUrl})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                }}
                                            />
                                            {card.isMatched && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                    <div className="bg-green-500 rounded-full p-1 shadow-sm scale-in bg-opacity-90">
                                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scaleIn {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .card-pattern {
                    background-image:
                        linear-gradient(45deg, rgba(255,255,255,0.12) 25%, transparent 25%),
                        linear-gradient(-45deg, rgba(255,255,255,0.12) 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.12) 75%),
                        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.12) 75%);
                    background-size: 12px 12px;
                    background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
                }
            `}} />
        </div>
    );
};
