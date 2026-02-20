import { memo } from 'react';
import { Clock, Star, Coins, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: 'earn' | 'spend';
  source: string;
  description?: string;
  created_at: string;
}

interface RecentActivityCardProps {
  pointsTransactions: Transaction[];
  coinsTransactions: Transaction[];
}

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    'daily_checkin': 'เช็คอินรายวัน',
    'content': 'อ่านเนื้อหา',
    'quiz': 'ทำแบบทดสอบ',
    'survey': 'ทำแบบสำรวจ',
    'receipt': 'อัปโหลดใบเสร็จ',
    'game': 'เล่นเกม',
    'mission': 'ทำภารกิจ',
    'reward': 'แลกของรางวัล',
    'registration': 'ลงทะเบียนใหม่',
  };
  return labels[source] || source;
};

const TransactionItem = memo(function TransactionItem({
  transaction,
  type
}: {
  transaction: Transaction;
  type: 'points' | 'coins';
}) {
  const isEarn = transaction.transaction_type === 'earn';
  const Icon = type === 'points' ? Star : Coins;
  const TrendIcon = isEarn ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center
        ${isEarn ? 'bg-accent/10' : 'bg-destructive/10'}
      `}>
        <Icon className={`w-5 h-5 ${isEarn ? 'text-accent' : 'text-destructive'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {transaction.description || getSourceLabel(transaction.source)}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(transaction.created_at), {
            addSuffix: true,
            locale: th
          })}
        </p>
      </div>

      <div className={`flex items-center gap-1 font-semibold ${isEarn ? 'text-accent' : 'text-destructive'}`}>
        <TrendIcon className="w-4 h-4" />
        <span>{isEarn ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString()}</span>
      </div>
    </div>
  );
});

export function RecentActivityCard({ pointsTransactions, coinsTransactions }: RecentActivityCardProps) {
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            กิจกรรมล่าสุด
          </CardTitle>
          <Link to="/history" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            ประวัติทั้งหมด <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="points">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              คะแนน
            </TabsTrigger>
            <TabsTrigger value="coins" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              เหรียญ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="mt-0">
            {pointsTransactions.length > 0 ? (
              <div className="overflow-y-auto">
                {pointsTransactions.slice(0, 4).map((t) => (
                  <TransactionItem key={t.id} transaction={t} type="points" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ยังไม่มีประวัติคะแนน</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="coins" className="mt-0">
            {coinsTransactions.length > 0 ? (
              <div className="overflow-y-auto">
                {coinsTransactions.slice(0, 4).map((t) => (
                  <TransactionItem key={t.id} transaction={t} type="coins" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>ยังไม่มีประวัติเหรียญ</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
