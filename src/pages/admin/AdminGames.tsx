import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Gamepad2, Settings, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminMatchGameSettings } from "@/components/admin/games/AdminMatchGameSettings";
import { AdminMatchGameImages } from "@/components/admin/games/AdminMatchGameImages";

interface WheelConfig {
    id: string;
    config_name: string;
    slot_count: number;
    coins_cost: number;
    free_spins_per_day: number;
}

interface WheelReward {
    id: string;
    wheel_id: string;
    slot_index: number;
    reward_type: string;
    reward_value: number;
    reward_label: string;
    reward_color: string;
    weight: number;
    limit_quota: number | null;
    image_url: string | null;
}

export default function AdminGames() {
    const [configs, setConfigs] = useState<WheelConfig[]>([]);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [rewards, setRewards] = useState<WheelReward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [configFormData, setConfigFormData] = useState({
        slot_count: 8,
        coins_cost: 0,
        free_spins_per_day: 1
    });

    useEffect(() => {
        fetchWheelData();
    }, []);

    const fetchWheelData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch active configs
            const { data: configData, error: configError } = await (supabase as any)
                .from('wheel_configs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (configError && configError.code !== 'PGRST116') {
                console.error('Error fetching config:', configError);
                toast.error('ไม่สามารถโหลดข้อมูลการตั้งค่าเกมได้');
                setIsLoading(false);
                return;
            }

            if (configData) {
                setConfigs([configData]);
                setActiveConfigId(configData.id);
                setConfigFormData({
                    slot_count: configData.slot_count,
                    coins_cost: configData.coins_cost || 0,
                    free_spins_per_day: configData.free_spins_per_day || 0
                });

                // 2. Fetch rewards for active config
                const { data: rewardsData, error: rewardsError } = await (supabase as any)
                    .from('wheel_rewards')
                    .select('*')
                    .eq('wheel_id', configData.id)
                    .order('slot_index', { ascending: true });

                if (rewardsError) {
                    console.error('Error fetching rewards:', rewardsError);
                    toast.error('ไม่สามารถโหลดข้อมูลของรางวัลในวงล้อได้');
                } else if (rewardsData) {
                    setRewards(rewardsData);
                }
            }
        } catch (e) {
            console.error(e);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRewardChange = (index: number, field: keyof WheelReward, value: any) => {
        const newRewards = [...rewards];
        newRewards[index] = { ...newRewards[index], [field]: value };
        setRewards(newRewards);
    };

    const handleRewardSave = async (id: string, updates: Partial<WheelReward>) => {
        try {
            const { error } = await (supabase as any)
                .from('wheel_rewards')
                .update(updates)
                .eq('id', id);

            if (error) {
                toast.error("ไม่สามารถบันทึกข้อมูลได้");
                console.error(error);
                fetchWheelData();
            }
        } catch (e) {
            console.error(e);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
            fetchWheelData();
        }
    };

    const handleSaveConfig = async () => {
        if (!activeConfigId) return;
        try {
            const currentConfig = configs[0];

            // Handle slot count changes
            if (configFormData.slot_count !== currentConfig.slot_count) {
                const diff = configFormData.slot_count - currentConfig.slot_count;
                if (diff > 0) {
                    const maxIndex = rewards.length > 0 ? Math.max(...rewards.map(r => r.slot_index)) : -1;
                    const newRewards = [];
                    for (let i = 0; i < diff; i++) {
                        newRewards.push({
                            wheel_id: activeConfigId,
                            slot_index: maxIndex + 1 + i,
                            reward_type: 'none',
                            reward_value: 0,
                            reward_label: 'ไม่ได้รางวัล',
                            reward_color: i % 2 === 0 ? '#CBD5E1' : '#E2E8F0',
                            weight: 10
                        });
                    }
                    await (supabase as any).from('wheel_rewards').insert(newRewards);
                } else {
                    const toDelete = rewards.slice(configFormData.slot_count).map(r => r.id);
                    if (toDelete.length > 0) {
                        await (supabase as any).from('wheel_rewards')
                            .delete()
                            .in('id', toDelete);
                    }
                }
            }

            const { error } = await (supabase as any)
                .from('wheel_configs')
                .update({
                    slot_count: configFormData.slot_count,
                    coins_cost: configFormData.coins_cost,
                    free_spins_per_day: configFormData.free_spins_per_day
                })
                .eq('id', activeConfigId);

            if (error) {
                toast.error("บันทึกการตั้งค่าล้มเหลว");
            } else {
                toast.success("บันทึกการตั้งค่าวงล้อแล้ว");
                fetchWheelData();
            }
        } catch (e) {
            console.error(e);
            toast.error("มีข้อผิดพลาดเกิดขึ้น");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6" />
                    จัดการเกม (Minigames)
                </h1>
                <p className="text-muted-foreground">ตั้งค่าของรางวัลและเงื่อนไขสำหรับเกมต่างๆ</p>
            </div>

            <Tabs defaultValue="wheel" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="wheel" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">เกมหมุนวงล้อ (Spin Wheel)</TabsTrigger>
                    <TabsTrigger value="match" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">เกมจับคู่ภาพ (Memory Match)</TabsTrigger>
                </TabsList>

                <TabsContent value="wheel" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5" />
                                    การตั้งค่าเกมหมุนวงล้อ
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {configs.length > 0 ? `แผนที่ใช้งาน: ${configs[0].config_name}` : 'กำลังโหลด...'}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {activeConfigId && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50">
                                    <div className="space-y-2">
                                        <Label htmlFor="slot_count">จำนวนช่องในวงล้อ</Label>
                                        <Input
                                            id="slot_count"
                                            type="number"
                                            min="2" max="24"
                                            value={configFormData.slot_count}
                                            onChange={e => setConfigFormData(prev => ({ ...prev, slot_count: parseInt(e.target.value) || 2 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="coins_cost">ราคาต่อการเล่น (เหรียญ)</Label>
                                        <Input
                                            id="coins_cost"
                                            type="number"
                                            min="0"
                                            value={configFormData.coins_cost}
                                            onChange={e => setConfigFormData(prev => ({ ...prev, coins_cost: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="free_spins_per_day">สิทธิ์หมุนฟรี (ครั้ง/วัน)</Label>
                                        <Input
                                            id="free_spins_per_day"
                                            type="number"
                                            min="0"
                                            value={configFormData.free_spins_per_day}
                                            onChange={e => setConfigFormData(prev => ({ ...prev, free_spins_per_day: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-3 flex justify-end">
                                        <Button onClick={handleSaveConfig}>บันทึกการตั้งค่าหลัก</Button>
                                    </div>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
                            ) : rewards.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลของรางวัลในวงล้อ</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16 text-center">ช่องที่</TableHead>
                                                <TableHead>ภาพ/สี</TableHead>
                                                <TableHead>ป้ายกำกับ (Label)</TableHead>
                                                <TableHead>รูปแบบรางวัล</TableHead>
                                                <TableHead className="text-right">มูลค่า (Value)</TableHead>
                                                <TableHead className="text-right">ความน่าจะเป็น (Weight)</TableHead>
                                                <TableHead className="text-right">โควต้า (Quota)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rewards.map((reward, index) => (
                                                <TableRow key={reward.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 w-[120px]">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="color"
                                                                    className="w-6 h-6 p-0 border-0 cursor-pointer"
                                                                    value={reward.reward_color}
                                                                    onChange={e => handleRewardChange(index, 'reward_color', e.target.value.toUpperCase())}
                                                                    onBlur={() => handleRewardSave(reward.id, { reward_color: reward.reward_color })}
                                                                />
                                                                <span className="text-[10px] text-muted-foreground">Color Hex</span>
                                                            </div>
                                                            <Input
                                                                placeholder="URL รูป"
                                                                value={reward.image_url || ''}
                                                                onChange={e => handleRewardChange(index, 'image_url', e.target.value)}
                                                                onBlur={() => handleRewardSave(reward.id, { image_url: reward.image_url || null })}
                                                                className="h-7 text-[10px] px-2 bg-transparent border-transparent hover:border-input focus:border-input"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={reward.reward_label || ''}
                                                            onChange={e => handleRewardChange(index, 'reward_label', e.target.value)}
                                                            onBlur={() => handleRewardSave(reward.id, { reward_label: reward.reward_label })}
                                                            className="h-8 text-sm min-w-[120px] bg-transparent border-transparent hover:border-input focus:border-input px-2"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="capitalize">
                                                        <Select
                                                            value={reward.reward_type}
                                                            onValueChange={v => {
                                                                handleRewardChange(index, 'reward_type', v);
                                                                handleRewardSave(reward.id, { reward_type: v });
                                                                if (v === 'none') {
                                                                    handleRewardChange(index, 'reward_value', 0);
                                                                    handleRewardSave(reward.id, { reward_value: 0 });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm bg-transparent border-transparent hover:border-input focus:border-input px-2"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="points">Points</SelectItem>
                                                                <SelectItem value="coins">Coins</SelectItem>
                                                                <SelectItem value="none">None</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            type="number"
                                                            className="w-full min-w-[70px] inline-block h-8 text-sm text-right bg-transparent border-transparent hover:border-input focus:border-input px-2"
                                                            value={reward.reward_value}
                                                            onChange={e => handleRewardChange(index, 'reward_value', parseInt(e.target.value) || 0)}
                                                            onBlur={() => handleRewardSave(reward.id, { reward_value: reward.reward_value })}
                                                            disabled={reward.reward_type === 'none'}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            type="number"
                                                            className="w-full min-w-[60px] inline-block h-8 text-sm text-right bg-transparent border-transparent hover:border-input focus:border-input px-2"
                                                            value={reward.weight}
                                                            onChange={e => handleRewardChange(index, 'weight', parseInt(e.target.value) || 1)}
                                                            onBlur={() => handleRewardSave(reward.id, { weight: reward.weight })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            type="number"
                                                            placeholder="ไม่จำกัด"
                                                            className="w-full min-w-[80px] inline-block h-8 text-sm text-right bg-transparent border-transparent hover:border-input focus:border-input px-2"
                                                            value={reward.limit_quota === null ? '' : reward.limit_quota}
                                                            onChange={e => { const v = e.target.value; handleRewardChange(index, 'limit_quota', v === '' ? null : parseInt(v)); }}
                                                            onBlur={() => handleRewardSave(reward.id, { limit_quota: reward.limit_quota })}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="match" className="space-y-6">
                    <AdminMatchGameSettings />
                    <AdminMatchGameImages />
                </TabsContent>
            </Tabs>

        </div>
    );
}
