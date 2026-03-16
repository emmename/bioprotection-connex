import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Users, Receipt, FileText, TrendingUp, Clock, CheckCircle,
  Gift, XCircle, ChevronRight, Activity, WalletCards, Shield,
  Award, Package, Truck, AlertTriangle, BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { MEMBER_TYPE_LABELS, TIER_CONFIG } from '@/constants/memberTypes';
import { TierSettings } from '@/types/gamification';

const CHART_COLORS = [
  '#0ea5e9', // Sky 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#f43f5e', // Rose 500
];

const sharedChartConfig = {
  value: { label: "จำนวน" }
};

const getTypeColor = (type: string | undefined | null) => {
  switch (type?.toLowerCase()) {
    case 'farm': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    case 'company_employee': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    case 'veterinarian': return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
    case 'livestock_shop': return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    case 'government': return 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100';
    default: return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
  }
};

/* ─── Types ─── */
interface DashboardStats {
  totalMembers: number;
  pendingMembers: number;
  pendingReceipts: number;
  totalContent: number;
  todayCheckins: number;
  approvedReceipts: number;
  rejectedReceipts: number;
  totalReceipts: number;
  redemptionBreakdown: Record<string, number>;
  memberBreakdown: {
    types: Record<string, number>;
    tiers: Record<string, number>;
    totalApproved: number;
  };
  tierSettings: TierSettings[];
  recentMembers: any[];
}



const REDEMPTION_STATUS: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pending: { label: 'รอดำเนินการ', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  processing: { label: 'กำลังจัดส่ง', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  shipped: { label: 'จัดส่งแล้ว', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
  completed: { label: 'สำเร็จ', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cancelled: { label: 'ยกเลิก', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

/* ─── Helpers ─── */
const pct = (v: number, t: number) => (t === 0 ? 0 : Math.round((v / t) * 100));

/* ─── Component ─── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    pendingMembers: 0,
    pendingReceipts: 0,
    totalContent: 0,
    todayCheckins: 0,
    approvedReceipts: 0,
    rejectedReceipts: 0,
    totalReceipts: 0,
    redemptionBreakdown: {},
    memberBreakdown: { types: {}, tiers: {}, totalApproved: 0 },
    tierSettings: [],
    recentMembers: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { count: totalMembers },
        { count: pendingMembers },
        { count: pendingReceipts },
        { count: totalContent },
        { count: todayCheckins },
        { count: approvedReceipts },
        { count: rejectedReceipts },
        { data: allRedemptionsData },
        { data: allProfilesData },
        { data: allTierSettings },
        { data: recentMembersData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('content').select('*', { count: 'exact', head: true }),
        supabase.from('daily_checkins').select('*', { count: 'exact', head: true }).eq('checkin_date', new Date().toISOString().split('T')[0]),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('reward_redemptions').select('status'),
        supabase.from('profiles').select('member_type, tier').eq('approval_status', 'approved'),
        supabase.from('tier_settings').select('*'),
        supabase.from('profiles').select('*').eq('approval_status', 'approved').order('created_at', { ascending: false }).limit(5),
      ]);

      const redemptionBreakdown: Record<string, number> = {};
      allRedemptionsData?.forEach((r) => {
        redemptionBreakdown[r.status] = (redemptionBreakdown[r.status] || 0) + 1;
      });

      const types: Record<string, number> = {};
      const tiers: Record<string, number> = {};
      let totalApproved = 0;
      allProfilesData?.forEach((p) => {
        const type = p.member_type || 'unspecified';
        const tier = p.tier || 'unassigned';
        types[type] = (types[type] || 0) + 1;
        tiers[tier] = (tiers[tier] || 0) + 1;
        totalApproved++;
      });

      setStats({
        totalMembers: totalMembers || 0,
        pendingMembers: pendingMembers || 0,
        pendingReceipts: pendingReceipts || 0,
        totalContent: totalContent || 0,
        todayCheckins: todayCheckins || 0,
        approvedReceipts: approvedReceipts || 0,
        rejectedReceipts: rejectedReceipts || 0,
        totalReceipts: (pendingReceipts || 0) + (approvedReceipts || 0) + (rejectedReceipts || 0),
        redemptionBreakdown,
        memberBreakdown: { types, tiers, totalApproved },
        tierSettings: (allTierSettings as any) || [],
        recentMembers: recentMembersData || [],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ─── Loading Skeleton ─── */
  if (isLoading) {
    return (
      <div className="space-y-6 p-2">
        <div className="h-16 bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalRedemptions = Object.values(stats.redemptionBreakdown).reduce((a, b) => a + b, 0);
  const pendingActions = stats.pendingMembers + stats.pendingReceipts + (stats.redemptionBreakdown['pending'] || 0);

  const receiptChartData = [
    { name: 'อนุมัติแล้ว', value: stats.approvedReceipts, fill: '#10b981' },
    { name: 'รอตรวจสอบ', value: stats.pendingReceipts, fill: '#fbbf24' },
    { name: 'ปฏิเสธ', value: stats.rejectedReceipts, fill: '#f87171' },
  ].filter(d => d.value > 0);

  const memberTypesData = Object.entries(stats.memberBreakdown.types)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count], index) => ({
      name: MEMBER_TYPE_LABELS[type?.toLowerCase()] || type,
      value: count,
      fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

  const memberTiersData = Object.entries(stats.memberBreakdown.tiers)
    .sort((a, b) => b[1] - a[1])
    .map(([tier, count], index) => {
      const cfg = TIER_CONFIG[tier] || TIER_CONFIG.unassigned;
      const tierDisplayName = stats.tierSettings.find(t => t.tier === tier)?.display_name || cfg.label;
      const fill = tier === 'premium' ? '#8b5cf6' : tier === 'gold' ? '#f59e0b' : tier === 'silver' ? '#94a3b8' : tier === 'bronze' ? '#d97706' : CHART_COLORS[index % CHART_COLORS.length];
      return {
        name: tierDisplayName,
        value: count,
        fill: fill
      };
    });

  /* ─── Render ─── */
  return (
    <div className="space-y-6 pb-10">

      {/* ══════════════════════════════════════════════
          SECTION 1 : Header
         ══════════════════════════════════════════════ */}
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            ภาพรวมระบบ
          </h1>
          <p className="text-muted-foreground text-sm mt-1">สรุปข้อมูลสำคัญประจำวัน</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          SECTION 2 : Headline KPIs (5 cards across top)
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="สมาชิกทั้งหมด" value={stats.totalMembers} accent="blue" />
        <KpiCard icon={FileText} label="เนื้อหาทั้งหมด" value={stats.totalContent} accent="purple" />
        <KpiCard icon={Receipt} label="ใบเสร็จทั้งหมด" value={stats.totalReceipts} accent="indigo" />
        <KpiCard icon={Gift} label="รายการแลกรางวัล" value={totalRedemptions} accent="emerald" />
        <KpiCard icon={TrendingUp} label="เช็คอินวันนี้" value={stats.todayCheckins} accent="amber" />
      </div>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT GRID
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CHARTS (Spans 2 cols on XL) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Member Types ── */}
            <Card className="shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  ประเภทสมาชิก
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 p-6 pt-0 flex-1 justify-center">
                {memberTypesData.length > 0 && (
                  <div className="w-[140px] h-[140px] shrink-0">
                    <ChartContainer config={sharedChartConfig} className="w-full h-full">
                      <PieChart>
                        <Pie
                          data={memberTypesData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={65}
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {memberTypesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                )}
                <div className="w-full divide-y border-y mt-auto">
                  {memberTypesData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-medium text-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">{entry.value.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-[10px] min-w-[3rem] justify-center font-semibold">
                          {pct(entry.value, stats.memberBreakdown.totalApproved)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Member Tiers ── */}
            <Card className="shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  ระดับสมาชิก
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 p-6 pt-0 flex-1 justify-center">
                {memberTiersData.length > 0 && (
                  <div className="w-[140px] h-[140px] shrink-0">
                    <ChartContainer config={sharedChartConfig} className="w-full h-full">
                      <PieChart>
                        <Pie
                          data={memberTiersData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={65}
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {memberTiersData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                )}
                <div className="w-full divide-y border-y mt-auto">
                  {memberTiersData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-semibold capitalize text-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground">{entry.value.toLocaleString()}</span>
                        <Badge variant="secondary" className="text-[10px] min-w-[3rem] justify-center font-semibold">
                          {pct(entry.value, stats.memberBreakdown.totalApproved)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Receipt Overview ── */}
            <Card className="shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <WalletCards className="w-5 h-5 text-indigo-500" />
                  ภาพรวมใบเสร็จ
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 p-6 pt-0 flex-1 justify-center">
                {stats.totalReceipts > 0 && (
                  <div className="w-[140px] h-[140px] shrink-0">
                    <ChartContainer config={sharedChartConfig} className="w-full h-full">
                      <PieChart>
                        <Pie
                          data={receiptChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={65}
                          strokeWidth={2}
                          paddingAngle={2}
                        >
                          {receiptChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                )}
                <div className="w-full space-y-4 mt-auto">
                  <ProgressRow label="อนุมัติแล้ว" value={stats.approvedReceipts} total={stats.totalReceipts} barColor="bg-emerald-500" textColor="text-emerald-600" />
                  <ProgressRow label="รอตรวจสอบ" value={stats.pendingReceipts} total={stats.totalReceipts} barColor="bg-amber-400" textColor="text-amber-600" />
                  <ProgressRow label="ปฏิเสธ" value={stats.rejectedReceipts} total={stats.totalReceipts} barColor="bg-red-400" textColor="text-red-500" />
                  <div className="flex items-center justify-end gap-2 pt-2 border-t text-sm font-semibold text-muted-foreground">
                    รวม <span className="text-lg font-black text-foreground">{stats.totalReceipts.toLocaleString()}</span> รายการ
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Redemption Status ── */}
            <Card className="shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  สถานะการแลกของรางวัล
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 flex flex-col justify-center flex-1">
                <div className="space-y-2 mt-auto">
                  {Object.entries(REDEMPTION_STATUS).map(([key, cfg]) => {
                    const count = stats.redemptionBreakdown[key] || 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={key} className={`flex items-center justify-between rounded-xl px-4 py-3 ${cfg.bg} transition-colors`}>
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <span className={`text-lg font-black ${cfg.color}`}>{count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t text-sm font-semibold text-muted-foreground">
                  รวม <span className="text-lg font-black text-foreground">{totalRedemptions.toLocaleString()}</span> รายการ
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT MEMBERS */}
        <div className="xl:col-span-1">
          <Card className="shadow-sm h-full flex flex-col min-h-[400px]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  สมาชิกล่าสุด
                </div>
                <Badge variant="secondary" className="font-normal text-xs">อนุมัติแล้วเท่านั้น</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1">
              {stats.recentMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex-1 flex items-center justify-center">ไม่มีข้อมูลสมาชิกล่าสุด</div>
              ) : (
                <div className="divide-y flex-1">
                  {stats.recentMembers.map((member) => (
                    <div key={member.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{member.first_name || '-'} {member.last_name || ''}</p>
                        <p className="text-xs text-muted-foreground">{member.email || 'ไม่มีข้อมูลติดต่อ'}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] capitalize ${getTypeColor(member.member_type)}`}>
                        {MEMBER_TYPE_LABELS[member.member_type?.toLowerCase()] || member.member_type || 'unassigned'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-3 border-t bg-muted/10 text-center mt-auto">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/admin/members')}>
                ดูสมาชิกทั้งหมด <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SECTION : Action Required (Alerts) NOW MOVED TO BOTTOM
         ══════════════════════════════════════════════ */}
      {pendingActions > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/40 mt-6 shadow-sm">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">
                งานรอดำเนินการ
                <Badge variant="destructive" className="ml-2 text-xs px-2 py-0 rounded-full">
                  {pendingActions}
                </Badge>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.pendingMembers > 0 && (
                <ActionChip icon={Clock} label="สมาชิกรออนุมัติ" count={stats.pendingMembers} color="amber" onClick={() => navigate('/admin/members')} />
              )}
              {stats.pendingReceipts > 0 && (
                <ActionChip icon={Receipt} label="ใบเสร็จรอตรวจ" count={stats.pendingReceipts} color="rose" onClick={() => navigate('/admin/receipts')} />
              )}
              {(stats.redemptionBreakdown['pending'] || 0) > 0 && (
                <ActionChip icon={Gift} label="รางวัลรอจัดส่ง" count={stats.redemptionBreakdown['pending'] || 0} color="orange" onClick={() => navigate('/admin/redemptions')} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-components (collocated for simplicity)
   ═══════════════════════════════════════════════ */

const ACCENT_MAP: Record<string, { icon: string; bg: string; ring: string }> = {
  blue: { icon: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  purple: { icon: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-200' },
  indigo: { icon: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-200' },
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  amber: { icon: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' },
};

/** Top-level KPI metric card */
function KpiCard({
  icon: Icon,
  label,
  value,
  accent = 'blue',
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent?: string;
}) {
  const c = ACCENT_MAP[accent] || ACCENT_MAP.blue;
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <CardContent className="p-5 flex flex-col gap-3">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          <p className="text-2xl font-black text-foreground mt-0.5">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Action-required chip inside alert banner */
function ActionChip({
  icon: Icon,
  label,
  count,
  color,
  onClick,
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-300 bg-white text-amber-800 hover:bg-amber-50',
    rose: 'border-rose-300 bg-white text-rose-800 hover:bg-rose-50',
    orange: 'border-orange-300 bg-white text-orange-800 hover:bg-orange-50',
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${colorMap[color] || colorMap.amber} cursor-pointer hover:shadow-md active:scale-[0.98] transition-all select-none`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-semibold flex-1">{label}</span>
      <span className="text-lg font-black">{count}</span>
      <ChevronRight className="w-4 h-4 opacity-40" />
    </div>
  );
}

/** Progress bar row used inside receipt overview */
function ProgressRow({
  label,
  value,
  total,
  barColor,
  textColor,
}: {
  label: string;
  value: number;
  total: number;
  barColor: string;
  textColor: string;
}) {
  const percentage = pct(value, total);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-foreground">{value.toLocaleString()}</span>
          <span className={`font-bold ${textColor}`}>{percentage}%</span>
        </div>
      </div>
      <Progress value={percentage} className="h-2.5 bg-muted" indicatorClassName={barColor} />
    </div>
  );
}
