import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Receipt, FileText, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface DashboardStats {
  totalMembers: number;
  pendingMembers: number;
  pendingReceipts: number;
  totalContent: number;
  todayCheckins: number;
  approvedReceipts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    pendingMembers: 0,
    pendingReceipts: 0,
    totalContent: 0,
    todayCheckins: 0,
    approvedReceipts: 0,
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
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('content').select('*', { count: 'exact', head: true }),
        supabase.from('daily_checkins').select('*', { count: 'exact', head: true }).eq('checkin_date', new Date().toISOString().split('T')[0]),
        supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      setStats({
        totalMembers: totalMembers || 0,
        pendingMembers: pendingMembers || 0,
        pendingReceipts: pendingReceipts || 0,
        totalContent: totalContent || 0,
        todayCheckins: todayCheckins || 0,
        approvedReceipts: approvedReceipts || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'สมาชิกทั้งหมด',
      value: stats.totalMembers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'รอการอนุมัติ',
      value: stats.pendingMembers,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'ใบเสร็จรอตรวจสอบ',
      value: stats.pendingReceipts,
      icon: Receipt,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'เนื้อหาทั้งหมด',
      value: stats.totalContent,
      icon: FileText,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'เช็คอินวันนี้',
      value: stats.todayCheckins,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'ใบเสร็จอนุมัติแล้ว',
      value: stats.approvedReceipts,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ภาพรวม</h1>
        <p className="text-muted-foreground">สถิติและข้อมูลสำคัญของระบบ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Card key={index} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {card.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
