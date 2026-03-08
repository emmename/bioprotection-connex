import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Container, Graphics, Text, Sprite } from '@pixi/react';
import * as PIXI from 'pixi.js';

import wheelBg from './spinwheel_bg.jpg';
import rewardImage from '@/assets/12.png';
import loseImage from '@/assets/10.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
type Reward = {
    id: string;
    label: string;
    color: string;
    type: string;
    value: number;
    weight: number;
    image_url: string | null;
};

const SPIN_DURATION_MS = 4000;
const EXTRA_SPINS = 5;

// Web Audio API Synthesizer Helper
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = () => {
    if (!sharedAudioCtx) {
        sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioCtx;
};

const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
    try {
        const audioCtx = getAudioCtx();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) { /* ignore audio errors if not interacted */ }
};

const playTick = () => playTone(600, 'triangle', 0.1, 0.05);
const playWin = () => {
    playTone(440, 'sine', 0.2, 0.1); // A4
    setTimeout(() => playTone(554.37, 'sine', 0.2, 0.1), 150); // C#5
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.1), 300); // E5
};

// Utility to convert hex to number for PIXI
const hexToNumber = (hex: string) => parseInt(hex.replace('#', ''), 16);

// Component to handle perfectly masked image filling an entire slice
const SliceCoverImage = ({ imageUrl, index, total, radius }: { imageUrl: string, index: number, total: number, radius: number }) => {
    const [maskObj, setMaskObj] = useState<PIXI.Graphics | null>(null);
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const sliceAngle = (Math.PI * 2) / total;
    const startAngle = index * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const textAngle = startAngle + sliceAngle / 2;

    // The target dimensions that the image needs to cover
    const targetWidth = Math.max(radius * sliceAngle * 1.5, 10); // make it sufficiently wider
    const targetHeight = radius;

    useEffect(() => {
        const img = new window.Image();
        img.src = imageUrl;
        img.onload = () => {
            setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
        };
    }, [imageUrl]);

    let scaleProps = {};
    if (imgSize.width > 0 && imgSize.height > 0) {
        // Calculate the scale needed to cover the target dimensions (like object-fit: cover)
        const scaleX = targetWidth / imgSize.width;
        const scaleY = targetHeight / imgSize.height;
        const maxScale = Math.max(scaleX, scaleY);
        scaleProps = { scale: maxScale };
    } else {
        // Fallback before image loads its size
        scaleProps = { width: targetWidth, height: targetHeight };
    }

    return (
        <Container>
            <Graphics
                ref={(g) => {
                    if (g && !maskObj) setMaskObj(g);
                }}
                draw={(g) => {
                    g.clear();
                    g.beginFill(0xff0000); // Mask can be any color
                    g.moveTo(0, 0);
                    g.arc(0, 0, radius, startAngle, endAngle);
                    g.endFill();
                }}
            />
            {maskObj && (
                <Sprite
                    image={imageUrl}
                    mask={maskObj}
                    anchor={new PIXI.Point(0.5, 1)}
                    x={0}
                    y={0}
                    rotation={textAngle + Math.PI / 2}
                    {...scaleProps}
                />
            )}
        </Container>
    );
};

export const WheelGame = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [playedToday, setPlayedToday] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<Reward | null>(null);

    // Fetch Rewards from Supabase
    useEffect(() => {
        const fetchWheelData = async () => {
            try {
                // 0. Get user profile
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    setUserProfile(profile);

                    // Get spins today
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);

                    const { count } = await (supabase as any)
                        .from('game_sessions')
                        .select('*', { count: 'exact', head: true })
                        .eq('profile_id', profile.id)
                        .eq('game_type', 'wheel')
                        .gte('created_at', startOfDay.toISOString());

                    setPlayedToday(count || 0);
                }

                // 1. Get Active Config
                const { data: configData, error: configError } = await (supabase as any)
                    .from('wheel_configs')
                    .select('id, slot_count, coins_cost, free_spins_per_day')
                    .eq('is_active', true)
                    .maybeSingle();

                if (configError || !configData) {
                    console.error('No active wheel config found', configError);
                    setIsLoading(false);
                    return;
                }
                setConfig(configData);

                // 2. Get Rewards for this config
                const { data: rewardsData, error: rewardsError } = await (supabase as any)
                    .from('wheel_rewards')
                    .select('*')
                    .eq('wheel_id', configData.id)
                    .order('slot_index', { ascending: true });

                if (rewardsError) {
                    console.error('Error fetching rewards', rewardsError);
                } else if (rewardsData && rewardsData.length > 0) {
                    const mappedRewards = (rewardsData as any[]).map(r => ({
                        id: r.id,
                        label: r.reward_label,
                        color: r.reward_color,
                        type: r.reward_type,
                        value: r.reward_value,
                        weight: r.weight || 10,
                        image_url: r.image_url || null
                    }));
                    setRewards(mappedRewards);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWheelData();
    }, []);

    // Animation Ref
    const animationRef = useRef<number>();
    const startRotationRef = useRef<number>(0);
    const targetRotationRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    // Easing function (easeOutCirc for dramatic stopping effect)
    const easeOutCirc = (x: number): number => {
        return Math.sqrt(1 - Math.pow(x - 1, 2));
    };

    const drawSlice = useCallback((g: PIXI.Graphics, index: number, total: number, reward: Reward) => {
        g.clear();
        const sliceAngle = (Math.PI * 2) / total;
        const startAngle = index * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        const radius = 147; // Reduced size by 5%

        g.lineStyle(2, 0xffffff, 1);
        g.beginFill(hexToNumber(reward.color));
        g.moveTo(0, 0);
        g.arc(0, 0, radius, startAngle, endAngle);
        g.endFill();
    }, []);

    const animate = useCallback((time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = time - startTimeRef.current;
        const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);

        // Apply easing
        const easedProgress = easeOutCirc(progress);

        // Detect slice crossing for tick sound
        const sliceAngle = rewards.length > 0 ? (Math.PI * 2) / rewards.length : 1;
        const previousRotation = rotation;


        // Calculate current rotation
        const currentRotation = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easedProgress;
        setRotation(currentRotation);

        // Tick sound logic
        const prevNormalized = previousRotation % sliceAngle;
        const currentNormalized = currentRotation % sliceAngle;
        if (currentNormalized < prevNormalized && elapsed > 50) {
            playTick();
        }

        if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        } else {
            setIsSpinning(false);
            playWin();
            // Determine winner based on final normalized rotation
            const normalizedRotation = currentRotation % (Math.PI * 2);

            // The top pointer is essentially at an angle of 3*Math.PI/2 backwards relative to rotation.
            // We will adjust the logic to find which slice lands at the top (pointer is at X=0, Y=-150).
            // Since PIXI handles rotation, 0 angle is on the right (+X axis).
            // So pointer is at 270 degrees (or -90 deg / -1.57 rad). 
            // The easiest way is to just find the angle of the pointer relative to the wheel.
            let pointerAngleRelativeToWheel = (Math.PI * 1.5 - normalizedRotation) % (Math.PI * 2);
            if (pointerAngleRelativeToWheel < 0) pointerAngleRelativeToWheel += Math.PI * 2;

            const winningIndex = Math.floor(pointerAngleRelativeToWheel / sliceAngle);
            if (rewards[winningIndex]) {
                setResult(rewards[winningIndex]);
            }
        }
    }, [rotation, rewards]);

    const spin = async () => {
        if (isSpinning || rewards.length === 0 || !config || !userProfile) return;

        const isFreeSpin = playedToday < (config.free_spins_per_day || 0);
        const cost = config.coins_cost || 0;

        if (!isFreeSpin && userProfile.total_coins < cost) {
            alert('เหรียญไม่เพียงพอ!');
            return;
        }

        setIsSpinning(true);
        setResult(null);

        // Pre-determine the winner based on weights
        const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        let winningIndex = 0;

        for (let i = 0; i < rewards.length; i++) {
            randomWeight -= rewards[i].weight;
            if (randomWeight <= 0) {
                winningIndex = i;
                break;
            }
        }

        const sliceAngle = (Math.PI * 2) / rewards.length;

        // We want the winning slice to end up at the top pointer (angle: 270 deg or 1.5*PI)
        // The center of the winning slice is `winningIndex * sliceAngle + sliceAngle / 2`.
        // We need rotation + sliceCenter = 1.5 * PI
        const winningSliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
        const targetBaseRotation = Math.PI * 1.5 - winningSliceCenter;

        // Backend Integration
        try {
            // Deduct coins if not free spin
            if (!isFreeSpin && cost > 0) {
                const { error: deductError } = await supabase.rpc('deduct_coins', {
                    p_profile_id: userProfile.id,
                    p_amount: cost,
                    p_source: 'game',
                    p_description: 'เล่นเกมหมุนวงล้อ (Spin Wheel)'
                });
                if (deductError) throw deductError;
                setUserProfile((prev: any) => prev ? { ...prev, total_coins: prev.total_coins - cost } : null);
            }

            // Record game session
            const wonRewardData = rewards[winningIndex];
            await (supabase as any).from('game_sessions').insert({
                profile_id: userProfile.id,
                game_type: 'wheel',
                coins_spent: (!isFreeSpin && cost > 0) ? cost : 0,
                rewards_earned: { reward_id: wonRewardData.id, label: wonRewardData.label, type: wonRewardData.type, value: wonRewardData.value },
                score: wonRewardData.value || 0
            });

            // Add won reward to transactions
            if (wonRewardData.type !== 'none' && wonRewardData.value > 0) {
                if (wonRewardData.type === 'points') {
                    const { error: pointsError } = await supabase.rpc('add_points', {
                        p_profile_id: userProfile.id,
                        p_amount: wonRewardData.value,
                        p_source: 'game',
                        p_description: `หมุนวงล้อ: ${wonRewardData.label}`
                    });
                    if (pointsError) throw pointsError;
                    setUserProfile((prev: any) => prev ? { ...prev, total_points: (prev.total_points || 0) + wonRewardData.value } : null);
                } else if (wonRewardData.type === 'coins') {
                    const { error: coinsError } = await supabase.rpc('add_coins', {
                        p_profile_id: userProfile.id,
                        p_amount: wonRewardData.value,
                        p_source: 'game',
                        p_description: `หมุนวงล้อ: ${wonRewardData.label}`
                    });
                    if (coinsError) throw coinsError;
                    setUserProfile((prev: any) => prev ? { ...prev, total_coins: (prev.total_coins || 0) + wonRewardData.value } : null);
                }
            }

            setPlayedToday(prev => prev + 1);
        } catch (error) {
            console.error("Failed to record game session", error);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
            setIsSpinning(false);
            return;
        }

        // Add extra spins
        startRotationRef.current = rotation;
        targetRotationRef.current = targetBaseRotation + (Math.PI * 2 * EXTRA_SPINS) + (Math.floor(rotation / (Math.PI * 2)) * Math.PI * 2);

        // Small random offset within the slice so it doesn't always land exactly in the center
        const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.8);
        targetRotationRef.current += randomOffset;

        startTimeRef.current = 0;
        animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const getButtonStyleAndText = () => {
        if (isLoading) return { text: 'กำลังโหลดข้อมูล...', disabled: true };
        if (!config) return { text: 'ไม่พบการตั้งค่า', disabled: true };
        if (!userProfile) return { text: 'กรุณาเข้าสู่ระบบเพื่อเล่น', disabled: true };

        const isFreeSpin = playedToday < (config.free_spins_per_day || 0);
        const cost = config.coins_cost || 0;

        if (isFreeSpin) {
            const left = (config.free_spins_per_day || 0) - playedToday;
            return { text: `หมุนฟรี (เหลือ ${left} สิทธิ์)`, disabled: false };
        }

        if (userProfile.total_coins < cost) {
            return { text: `เหรียญไม่พอ (ต้องการ ${cost} เหรียญ)`, disabled: true };
        }

        return { text: `หมุนเลย (ใช้ ${cost} เหรียญ)`, disabled: false };
    };

    const buttonProps = getButtonStyleAndText();

    return (
        <div
            className="flex-1 w-full flex flex-col items-center justify-center relative overflow-hidden"
            style={{
                backgroundImage: `url(${wheelBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Content Container */}
            <div className="relative z-10 w-full h-full max-w-md flex flex-col items-center justify-between py-6">
                <div className="w-full">
                    {userProfile && (
                        <div className="w-full flex justify-end px-4">
                            <div className="bg-black/30 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg border border-white/20">
                                💰 {userProfile.total_coins?.toLocaleString()} เหรียญ
                            </div>
                        </div>
                    )}

                </div>

                <div className="relative w-full max-w-[400px] h-[380px] flex items-center justify-center mt-32">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/50 backdrop-blur-sm rounded-2xl">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : rewards.length === 0 ? (
                        <div className="text-muted-foreground text-center px-4">ยังไม่มีการตั้งค่าของรางวัลในระบบ</div>
                    ) : (
                        <>
                            {/* 3D Pin (Pointer) */}
                            <svg className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 w-12 h-16 drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="pin-gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f87171" />
                                        <stop offset="40%" stopColor="#ef4444" />
                                        <stop offset="100%" stopColor="#991b1b" />
                                    </linearGradient>
                                </defs>
                                <path d="M20 54 L6 20 Q 20 0 34 20 Z" fill="url(#pin-gradient)" />
                                <path d="M20 50 L10 21 Q 20 5 30 21 Z" fill="#ffffff" fillOpacity="0.2" />
                            </svg>

                            <Stage width={400} height={430} options={{ backgroundAlpha: 0, antialias: true }}>
                                {/* Outer Rim (Thickness) */}
                                <Graphics draw={(g) => {
                                    // Drop shadow
                                    g.beginFill(0x000000, 0.15);
                                    g.drawCircle(200, 201, 159);
                                    g.endFill();

                                    // 3D Rim Base (Dark Gold)
                                    g.beginFill(0xb45309); // amber-700
                                    g.drawCircle(200, 199, 157);
                                    g.endFill();

                                    // Metallic Lip (Bright Gold)
                                    g.beginFill(0xfbbf24); // amber-400
                                    g.drawCircle(200, 195, 157);
                                    g.endFill();

                                    // Inner Edge
                                    g.beginFill(0xf59e0b); // amber-500
                                    g.drawCircle(200, 195, 147);
                                    g.endFill();

                                    // Base back for slices
                                    g.beginFill(0xffffff);
                                    g.drawCircle(200, 195, 147);
                                    g.endFill();
                                }} />

                                <Container x={200} y={195} rotation={rotation}>
                                    {rewards.map((reward, index) => {
                                        const total = rewards.length;
                                        const sliceAngle = (Math.PI * 2) / total;
                                        // Text is positioned in the middle of the slice
                                        const textAngle = index * sliceAngle + sliceAngle / 2;
                                        const textRadius = 125; // Adjusted proportionally
                                        return (
                                            <Container key={reward.id}>
                                                <Graphics draw={(g) => drawSlice(g, index, total, reward)} />
                                                {reward.image_url ? (
                                                    <SliceCoverImage imageUrl={reward.image_url} index={index} total={total} radius={147} />
                                                ) : (
                                                    <Text
                                                        text={reward.label}
                                                        anchor={new PIXI.Point(0, 0.5)}
                                                        x={Math.cos(textAngle) * 137}
                                                        y={Math.sin(textAngle) * 137}
                                                        rotation={textAngle + Math.PI} // Radial pointing towards center
                                                        style={
                                                            new PIXI.TextStyle({
                                                                fill: '#334155',
                                                                fontSize: 18,
                                                                fontWeight: 'normal',
                                                                fontFamily: 'Itim, cursive',
                                                                wordWrap: false
                                                            })
                                                        }
                                                    />
                                                )}
                                            </Container>
                                        )
                                    })}
                                    {/* 3D Center Peg */}
                                    <Graphics draw={(g) => {
                                        // Shadow
                                        g.beginFill(0x000000, 0.2);
                                        g.drawCircle(0, 4, 32);
                                        g.endFill();

                                        // Peg Base (Metallic)
                                        g.beginFill(0xf8fafc);
                                        g.lineStyle(2, 0x94a3b8, 1);
                                        g.drawCircle(0, 0, 30);
                                        g.endFill();

                                        // Peg Inner Ring
                                        g.beginFill(0xe2e8f0);
                                        g.lineStyle(0);
                                        g.drawCircle(0, 0, 22);
                                        g.endFill();

                                        // Red Button
                                        g.beginFill(0xef4444);
                                        g.drawCircle(0, -2, 14);
                                        g.endFill();

                                        // Button Highlight
                                        g.beginFill(0xffffff, 0.6);
                                        g.drawCircle(-3, -5, 5);
                                        g.endFill();
                                    }} />
                                </Container>

                            </Stage>
                        </>
                    )}
                </div>

                <div className="w-full flex flex-col items-center gap-2 -mt-4">
                    <button
                        onClick={spin}
                        disabled={isSpinning || rewards.length === 0 || isLoading || buttonProps.disabled}
                        className="w-64 bg-black/80 hover:bg-black text-white py-4 rounded-full font-bold shadow-2xl transition-all disabled:opacity-50 text-lg active:scale-95 backdrop-blur-sm border border-white/20"
                    >
                        {isSpinning ? 'กำลังหมุน...' : buttonProps.text}
                    </button>

                    {/* Result Popup Modal */}
                    {result && (() => {
                        const isWin = result.type !== 'none' && !result.label.includes('ไม่ได้รางวัล');
                        return (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="relative w-[90%] max-w-sm flex flex-col items-center animate-in zoom-in-90 duration-500 delay-150">
                                    {/* Glow Effect behind image */}
                                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl -z-10 animate-pulse ${isWin ? 'bg-yellow-400/30' : 'bg-gray-400/20'}`}></div>

                                    <img
                                        src={isWin ? rewardImage : loseImage}
                                        alt={isWin ? "Reward" : "Try Again"}
                                        className={`w-48 h-48 object-contain mb-4 ${isWin ? 'drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]' : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`}
                                    />

                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl w-full text-center shadow-2xl">
                                        <h2 className={`text-3xl font-bold mb-2 drop-shadow-md ${isWin ? 'text-yellow-400' : 'text-gray-200'}`}>
                                            {isWin ? '🎉 ยินดีด้วย! 🎉' : 'ไม่เป็นไรนะ!'}
                                        </h2>
                                        <p className="text-white text-lg mb-6">
                                            {isWin ? (
                                                <>
                                                    คุณได้รับรางวัล:<br />
                                                    <span className="text-2xl font-bold text-yellow-200 mt-2 block">{result.label}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-100">รอบนี้ยังไม่ได้รางวัล<br />สะสมเหรียญแล้วมาลองใหม่นะ!</span>
                                            )}
                                        </p>

                                        <button
                                            onClick={() => setResult(null)}
                                            className={`w-full font-bold py-3 px-6 rounded-full shadow-lg transition-transform active:scale-95 text-white ${isWin ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500' : 'bg-gray-600 hover:bg-gray-500 border border-gray-400'}`}
                                        >
                                            {isWin ? 'รับรางวัล' : 'ตกลง'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
