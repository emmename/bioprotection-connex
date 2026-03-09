import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Plus, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";

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

export function AdminMatchGameSettings() {
    const [config, setConfig] = useState<MatchConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('match_configs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Ensure default levels if empty
                if (!data.levels_config || data.levels_config.length === 0) {
                    data.levels_config = [{ grid: [2, 3], time: 30 }];
                }
                setConfig(data);
            }
        } catch (e) {
            console.error("Error fetching match config:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            const { error } = await (supabase as any)
                .from('match_configs')
                .update({
                    config_name: config.config_name,
                    coins_cost: config.coins_cost,
                    free_plays_per_day: config.free_plays_per_day,
                    reward_type: config.reward_type,
                    reward_value: config.reward_value,
                    levels_config: config.levels_config
                })
                .eq('id', config.id);

            if (error) throw error;
            toast.success("บันทึกการตั้งค่าสำเร็จ");
        } catch (e) {
            console.error("Error saving match config:", e);
            toast.error("บันทึกการตั้งค่าล้มเหลว");
        } finally {
            setIsSaving(false);
        }
    };

    const addLevel = () => {
        if (!config) return;
        setConfig({
            ...config,
            levels_config: [...config.levels_config, { grid: [4, 4], time: 60 }]
        });
    };

    const removeLevel = (index: number) => {
        if (!config || config.levels_config.length <= 1) return;
        const newLevels = [...config.levels_config];
        newLevels.splice(index, 1);
        setConfig({ ...config, levels_config: newLevels });
    };

    const updateLevel = (index: number, gridRows: number, gridCols: number, time: number) => {
        if (!config) return;
        const newLevels = [...config.levels_config];
        newLevels[index] = { grid: [gridRows, gridCols], time };
        setConfig({ ...config, levels_config: newLevels });
    };

    if (isLoading) {
        return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!config) {
        return <div className="py-12 text-center text-muted-foreground">ไม่พบการตั้งค่าเกมจับคู่ภาพ (โปรดรัน Database Migration)</div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        ตั้งค่าเกมจับคู่ภาพ (Memory Match)
                    </CardTitle>
                    <CardDescription className="mt-1">
                        จัดการค่าธรรมเนียม เลเวล และรางวัลเมื่อเล่นจบ
                    </CardDescription>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    บันทึกการตั้งค่า
                </Button>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* General Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="space-y-2">
                        <Label>ราคาต่อโควต้า (เหรียญ)</Label>
                        <Input
                            type="number" min="0"
                            value={config.coins_cost}
                            onChange={(e) => setConfig({ ...config, coins_cost: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>สิทธิ์เล่นฟรี (ครั้ง/วัน)</Label>
                        <Input
                            type="number" min="0"
                            value={config.free_plays_per_day}
                            onChange={(e) => setConfig({ ...config, free_plays_per_day: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>ประเภทรางวัล (เมื่อผ่านทุกเลเวล)</Label>
                        <Select
                            value={config.reward_type}
                            onValueChange={(v) => setConfig({ ...config, reward_type: v })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="coins">เหรียญ</SelectItem>
                                <SelectItem value="points">แต้ม</SelectItem>
                                <SelectItem value="none">ไม่มีรางวัล</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>มูลค่ารางวัล</Label>
                        <Input
                            type="number" min="0"
                            value={config.reward_value}
                            disabled={config.reward_type === 'none'}
                            onChange={(e) => setConfig({ ...config, reward_value: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                {/* Level Settings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            ระดับความยาก (Levels)
                        </h3>
                        <Button variant="outline" size="sm" onClick={addLevel}>
                            <Plus className="w-4 h-4 mr-2" /> เพิ่มเลเวล
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {config.levels_config.map((level, index) => (
                            <div key={index} className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-white shadow-sm">
                                <div className="w-full sm:w-auto font-medium text-sm text-muted-foreground pt-2">
                                    เลเวล {index + 1}
                                </div>
                                <div className="space-y-2 flex-1 min-w-[120px]">
                                    <Label className="text-xs">แกน X (คอลัมน์)</Label>
                                    <Input
                                        type="number" min="2" max="8"
                                        value={level.grid[0]}
                                        onChange={(e) => updateLevel(index, parseInt(e.target.value) || 2, level.grid[1], level.time)}
                                    />
                                </div>
                                <div className="space-y-2 flex-1 min-w-[120px]">
                                    <Label className="text-xs">แกน Y (แถว)</Label>
                                    <Input
                                        type="number" min="2" max="8"
                                        value={level.grid[1]}
                                        onChange={(e) => updateLevel(index, level.grid[0], parseInt(e.target.value) || 2, level.time)}
                                    />
                                </div>
                                <div className="space-y-2 flex-1 min-w-[150px]">
                                    <Label className="text-xs">เวลา (วินาที)</Label>
                                    <Input
                                        type="number" min="10"
                                        value={level.time}
                                        onChange={(e) => updateLevel(index, level.grid[0], level.grid[1], parseInt(e.target.value) || 10)}
                                    />
                                </div>
                                <div className="space-y-2 md:pb-0.5">
                                    <Button
                                        variant="destructive" size="icon"
                                        onClick={() => removeLevel(index)}
                                        disabled={config.levels_config.length <= 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="w-full mt-2 text-xs text-muted-foreground flex justify-end">
                                    (ขนาด {level.grid[0]}x{level.grid[1]} = ใช้การ์ดทั้งหมด {level.grid[0] * level.grid[1]} ใบ / {Math.floor((level.grid[0] * level.grid[1]) / 2)} คู่)
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Calculate max pairs across all levels to inform admins */}
                    <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                        <ImageIcon className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <strong>คำแนะนำ:</strong> เกมนี้สุ่มภาพให้ซ้ำคู่กันได้ แต่ละเลเวลจะคำนวณจำนวนคู่ที่ต้องใช้จาก <code className="bg-white px-1 rounded text-black text-xs">แกน X × แกน Y / 2</code>
                            (หากผลคูณเป็นเลขคี่ จะมีใบเศษ 1 ใบซึ่งระบบจะซ่อนไว้เพื่อไม่ให้กระทบการเล่น).
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
