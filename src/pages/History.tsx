import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { usePoints, useCoins } from '@/hooks/useGamification';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

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

interface Transaction {
    id: string;
    transaction_type: string;
    description: string | null;
    source: string;
    amount: number;
    created_at: string;
}

export default function History() {
    // const navigate = useNavigate(); // Navigate might still be used for empty state actions
    const navigate = useNavigate();
    const { transactions: pointsTransactions, isLoading: pointsLoading } = usePoints();
    const { transactions: coinsTransactions, isLoading: coinsLoading } = useCoins();

    const TransactionItem = ({ transaction, type }: { transaction: Transaction, type: 'points' | 'coins' }) => {
        const isEarn = transaction.transaction_type === 'earn';
        const Icon = type === 'points' ? Star : Coins;
        const TrendIcon = isEarn ? TrendingUp : TrendingDown;

        return (
            <div className="flex items-center gap-3 py-4 border-b last:border-0">
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
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            {/* Header */}
            <PageHeader
                title="ประวัติการทำรายการ"
                subtitle="ประวัติคะแนนและเหรียญทั้งหมด"
                className="gradient-primary text-primary-foreground border-none"
            />

            <main className="container mx-auto px-4 py-6">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                        <Tabs defaultValue="points" className="w-full">
                            <div className="p-4 border-b">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="points" className="flex items-center gap-2">
                                        <Star className="w-4 h-4" />
                                        คะแนนสะสม
                                    </TabsTrigger>
                                    <TabsTrigger value="coins" className="flex items-center gap-2">
                                        <Coins className="w-4 h-4" />
                                        เหรียญ
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="points" className="m-0">
                                {pointsLoading ? (
                                    <div className="p-4">
                                        <ListSkeleton />
                                    </div>
                                ) : pointsTransactions.length > 0 ? (
                                    <div className="px-4">
                                        {pointsTransactions.map((t) => (
                                            <TransactionItem key={t.id} transaction={t} type="points" />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={Star}
                                        title="ยังไม่มีประวัติคะแนน"
                                        description="ร่วมกิจกรรมต่างๆ เพื่อสะสมคะแนนแลกของรางวัล"
                                        actionLabel="ดูภารกิจ"
                                        onAction={() => navigate('/missions')}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="coins" className="m-0">
                                {coinsLoading ? (
                                    <div className="p-4">
                                        <ListSkeleton />
                                    </div>
                                ) : coinsTransactions.length > 0 ? (
                                    <div className="px-4">
                                        {coinsTransactions.map((t) => (
                                            <TransactionItem key={t.id} transaction={t} type="coins" />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        icon={Coins}
                                        title="ยังไม่มีประวัติเหรียญ"
                                        description="เช็คอินรายวันเพื่อรับเหรียญสะสม"
                                        actionLabel="เช็คอิน"
                                        onAction={() => navigate('/dashboard')}
                                    />
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
