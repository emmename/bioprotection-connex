import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trophy, Calendar, Save, Loader2, Users, Trash2, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Database } from "@/integrations/supabase/types";

type TierLevel = Database["public"]["Enums"]["tier_level"];

interface TierSetting {
  id: string;
  tier: TierLevel;
  display_name: string;
  min_points: number;
  max_points: number | null;
  benefits: string[] | null;
  color: string | null;
}



interface CheckinReward {
  id: string;
  day_number: number;
  coins_reward: number;
  is_bonus: boolean;
}

const tierLabels: Record<TierLevel, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const tierColors: Record<TierLevel, string> = {
  bronze: "bg-amber-700",
  silver: "bg-gray-400",
  gold: "bg-yellow-500",
  platinum: "bg-purple-500",
};

const AdminSettings = () => {
  const [tierSettings, setTierSettings] = useState<TierSetting[]>([]);

  const [checkinRewards, setCheckinRewards] = useState<CheckinReward[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [exchangeIsActive, setExchangeIsActive] = useState<boolean>(true);
  const [exchangeMinCoins, setExchangeMinCoins] = useState<number>(100);
  const [exchangeMaxDailyCoins, setExchangeMaxDailyCoins] = useState<number>(5000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    deleted: string[];
    errors?: { email: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setIsLoading(true);
    try {
      const [tierRes, checkinRes, systemRes] = await Promise.all([
        supabase.from("tier_settings").select("*").order("min_points", { ascending: true }),
        supabase.from("checkin_rewards").select("*").order("day_number", { ascending: true }),
        // @ts-expect-error system_settings table not in generated types
        supabase.from("system_settings").select("*"),
      ]);

      if (tierRes.data) setTierSettings(tierRes.data);
      if (checkinRes.data) setCheckinRewards(checkinRes.data);

      if (systemRes.data) {
        // @ts-expect-error system_settings table not in generated types
        const settings = systemRes.data as { key: string, value: string }[];
        const rate = settings.find(s => s.key === 'coins_per_point' || s.key === 'coins_to_points_ratio');
        const active = settings.find(s => s.key === 'exchange_is_active');
        const min = settings.find(s => s.key === 'exchange_min_coins');
        const max = settings.find(s => s.key === 'exchange_max_daily_coins');

        if (rate) setExchangeRate(parseInt(rate.value) || 1);
        if (active) setExchangeIsActive(active.value === 'true');
        if (min) setExchangeMinCoins(parseInt(min.value) || 100);
        if (max) setExchangeMaxDailyCoins(parseInt(max.value) || 5000);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierChange = (id: string, field: keyof TierSetting, value: string | number | boolean | string[]) => {
    setTierSettings((prev) =>
      prev.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier))
    );
  };



  const handleCheckinChange = (id: string, field: keyof CheckinReward, value: string | number | boolean) => {
    setCheckinRewards((prev) =>
      prev.map((reward) => (reward.id === id ? { ...reward, [field]: value } : reward))
    );
  };

  const saveTierSettings = async () => {
    setIsSaving(true);
    try {
      for (const tier of tierSettings) {
        const { error } = await supabase
          .from("tier_settings")
          .update({
            display_name: tier.display_name,
            min_points: tier.min_points,
            max_points: tier.max_points,
            benefits: tier.benefits,
            color: tier.color,
          })
          .eq("id", tier.id);

        if (error) throw error;
      }
      toast.success("บันทึกการตั้งค่า Tier สำเร็จ");
    } catch (error) {
      console.error("Error saving tier settings:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };



  const saveCheckinRewards = async () => {
    setIsSaving(true);
    try {
      for (const reward of checkinRewards) {
        const { error } = await supabase
          .from("checkin_rewards")
          .update({
            coins_reward: reward.coins_reward,
            is_bonus: reward.is_bonus,
          })
          .eq("id", reward.id);

        if (error) throw error;
      }
      toast.success("บันทึกการตั้งค่า Check-in Rewards สำเร็จ");
    } catch (error) {
      console.error("Error saving checkin rewards:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  const cleanupOrphanUsers = async () => {
    if (!confirm('คุณต้องการลบ auth users ที่ไม่มี profile ใช่หรือไม่?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    setIsCleaningOrphans(true);
    setCleanupResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphan-users', {
        method: 'POST',
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setCleanupResult({
        deleted: data.deleted || [],
        errors: data.errors,
      });

      if (data.deleted?.length > 0) {
        toast.success(`ลบผู้ใช้ที่ไม่มี profile สำเร็จ ${data.deleted.length} บัญชี`);
      } else {
        toast.info('ไม่พบผู้ใช้ที่ไม่มี profile');
      }
    } catch (error) {
      console.error('Error cleaning up orphan users:', error);
      toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + (error as Error).message);
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ตั้งค่าระบบ</h1>
        <p className="text-muted-foreground">จัดการการตั้งค่าต่างๆ ของระบบ</p>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 p-1 bg-muted rounded-lg">
          <TabsTrigger value="tiers" className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Tier</span>
          </TabsTrigger>

          <TabsTrigger value="checkins" className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Check-in</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        {/* Tier Settings */}
        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ตั้งค่า Tier</CardTitle>
              <Button onClick={saveTierSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                บันทึก
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {tierSettings.map((tier) => (
                  <div key={tier.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full ${!tier.color ? tierColors[tier.tier] : ''}`}
                          style={tier.color ? { backgroundColor: tier.color } : {}}
                        />
                        <h3 className="font-semibold text-lg">{tier.display_name || tierLabels[tier.tier]}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>สี (Color)</Label>
                        <Input
                          type="color"
                          value={tier.color || "#000000"}
                          onChange={(e) => handleTierChange(tier.id, "color", e.target.value)}
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ชื่อที่แสดง (Display Name)</Label>
                        <Input
                          value={tier.display_name || tierLabels[tier.tier]}
                          onChange={(e) => handleTierChange(tier.id, "display_name", e.target.value)}
                          placeholder={tierLabels[tier.tier]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>คะแนนขั้นต่ำ</Label>
                        <Input
                          type="number"
                          value={tier.min_points}
                          onChange={(e) => handleTierChange(tier.id, "min_points", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>คะแนนสูงสุด {tier.tier === "platinum" && "(ไม่จำกัด = ว่าง)"}</Label>
                        <Input
                          type="number"
                          value={tier.max_points ?? ""}
                          placeholder={tier.tier === "platinum" ? "ไม่จำกัด" : ""}
                          onChange={(e) => handleTierChange(tier.id, "max_points", e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>สิทธิประโยชน์ (แยกด้วย Enter)</Label>
                      <textarea
                        className="w-full min-h-[100px] p-3 border rounded-md bg-background text-foreground"
                        value={(tier.benefits || []).join("\n")}
                        onChange={(e) => handleTierChange(tier.id, "benefits", e.target.value.split("\n").filter(Boolean))}
                        placeholder="เพิ่มสิทธิประโยชน์..."
                      />
                    </div>
                  </div>
                ))}

                {tierSettings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล Tier Settings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Game Settings */}


        {/* Checkin Rewards */}
        <TabsContent value="checkins" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ตั้งค่า Check-in Rewards</CardTitle>
              <Button onClick={saveCheckinRewards} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                บันทึก
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {checkinRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`border rounded-lg p-4 space-y-3 ${reward.is_bonus ? "border-primary bg-primary/5" : ""}`}
                  >
                    <div className="text-center">
                      <span className="text-sm text-muted-foreground">วันที่</span>
                      <p className="text-2xl font-bold">{reward.day_number}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">เหรียญ</Label>
                      <Input
                        type="number"
                        value={reward.coins_reward}
                        onChange={(e) => handleCheckinChange(reward.id, "coins_reward", parseInt(e.target.value) || 0)}
                        className="text-center"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={reward.is_bonus}
                        onCheckedChange={(checked) => handleCheckinChange(reward.id, "is_bonus", checked)}
                      />
                      <Label className="text-xs">โบนัส</Label>
                    </div>
                  </div>
                ))}

                {checkinRewards.length === 0 && (
                  <div className="col-span-full">
                    <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล Check-in Rewards</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings (Exchange Rate) */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ตั้งค่าระบบ (System Settings)</CardTitle>
              <Button onClick={() => {
                const saveSystemSettings = async () => {
                  // Validation: Min coins must be divisible by Rate
                  if (exchangeMinCoins % exchangeRate !== 0) {
                    toast.error(`จำนวนขั้นต่ำ (${exchangeMinCoins}) ต้องหารด้วยอัตราแลกเปลี่ยน (${exchangeRate}) ลงตัว เพื่อให้ได้คะแนนเป็นจำนวนเต็ม`);
                    return;
                  }

                  setIsSaving(true);
                  try {
                    // Update all settings
                    const updates = [
                      { key: 'exchange_is_active', value: exchangeIsActive.toString(), description: 'Turn on/off coin exchange feature' },
                      { key: 'exchange_min_coins', value: exchangeMinCoins.toString(), description: 'Minimum coins required to exchange' },
                      { key: 'exchange_max_daily_coins', value: exchangeMaxDailyCoins.toString(), description: 'Maximum coins allowed to exchange per day (0=Unlimited)' },
                      { key: 'coins_per_point', value: exchangeRate.toString(), description: 'Number of coins needed to get 1 point' }
                    ];

                    const { error } = await supabase
                      // @ts-expect-error system_settings table not in generated types
                      .from("system_settings")
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .upsert(updates as any);

                    if (error) throw error;
                    toast.success("บันทึกการตั้งค่าระบบสำเร็จ");
                  } catch (error) {
                    console.error("Error saving system settings:", error);
                    toast.error("เกิดข้อผิดพลาดในการบันทึก");
                  } finally {
                    setIsSaving(false);
                  }
                };
                saveSystemSettings();
              }} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                บันทึก
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Settings className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">ระบบแลกคะแนน (Coin Exchange)</h3>
                        <p className="text-sm text-muted-foreground">ตั้งค่าเงื่อนไขการแลกเหรียญเป็นคะแนน</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="active-mode">เปิดใช้งาน</Label>
                      <Switch
                        id="active-mode"
                        checked={exchangeIsActive}
                        onCheckedChange={setExchangeIsActive}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>อัตราแลกเปลี่ยน (Coins per Point)</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="1"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          เหรียญ = 1 คะแนน
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        เช่น ตั้งค่า 10 หมายความว่าต้องใช้ 10 เหรียญ เพื่อแลก 1 คะแนน
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>ขั้นต่ำในการแลก (Min Coins)</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="0"
                            value={exchangeMinCoins}
                            onChange={(e) => setExchangeMinCoins(parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          เหรียญ
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>จำกัดสูงสุดต่อวัน (Max Daily)</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={exchangeMaxDailyCoins === 0 ? "" : exchangeMaxDailyCoins}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                              setExchangeMaxDailyCoins(isNaN(val) ? 0 : val);
                            }}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap min-w-[80px]">
                          {exchangeMaxDailyCoins === 0 ? "ไม่จำกัด" : "เหรียญ/วัน"}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        เว้นว่าง หรือใส่ 0 หากต้องการให้แลกได้ไม่จำกัด
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                ลบ Auth Users ที่ไม่มี Profile
              </CardTitle>
              <CardDescription>
                ลบบัญชีผู้ใช้ที่สมัครแล้วแต่ยังไม่ได้ลงทะเบียนข้อมูลสมาชิก
                เพื่อให้ผู้ใช้สามารถสมัครใหม่ด้วยอีเมลเดิมได้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>คำเตือน</AlertTitle>
                <AlertDescription>
                  การลบบัญชีผู้ใช้ไม่สามารถย้อนกลับได้ โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                onClick={cleanupOrphanUsers}
                disabled={isCleaningOrphans}
                className="w-full sm:w-auto"
              >
                {isCleaningOrphans ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    กำลังลบ...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    ลบ Auth Users ที่ไม่มี Profile
                  </>
                )}
              </Button>

              {cleanupResult && (
                <div className="mt-4 space-y-2">
                  {cleanupResult.deleted.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        ลบสำเร็จ {cleanupResult.deleted.length} บัญชี:
                      </p>
                      <ul className="mt-2 text-sm text-green-700 dark:text-green-300 list-disc list-inside">
                        {cleanupResult.deleted.map((email, i) => (
                          <li key={i}>{email}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cleanupResult.errors && cleanupResult.errors.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="font-medium text-red-800 dark:text-red-200">
                        ลบไม่สำเร็จ {cleanupResult.errors.length} บัญชี:
                      </p>
                      <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                        {cleanupResult.errors.map((err, i) => (
                          <li key={i}>{err.email}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cleanupResult.deleted.length === 0 && (!cleanupResult.errors || cleanupResult.errors.length === 0) && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-blue-800 dark:text-blue-200">
                        ไม่พบ auth users ที่ไม่มี profile
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
