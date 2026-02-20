import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RejectedMemberMessage } from '@/components/RejectedMemberMessage';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface Redemption {
  id: string;
  points_spent: number;
  status: string;
  shipping_address: string | null;
  tracking_number: string | null;
  created_at: string;
  rewards: {
    name: string;
    image_url: string | null;
    description: string | null;
  };
}

export default function MyRedemptions() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    if (!profile) return;

    const fetchRedemptions = async () => {
      const { data, error } = await supabase
        .from('reward_redemptions')
        .select(`
          id,
          points_spent,
          status,
          shipping_address,
          tracking_number,
          created_at,
          rewards (
            name,
            image_url,
            description
          )
        `)
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRedemptions(data as Redemption[]);
      }
      setIsLoading(false);
    };

    fetchRedemptions();
  }, [profile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="w-3 h-3 mr-1" />
            รอดำเนินการ
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Package className="w-3 h-3 mr-1" />
            กำลังจัดส่ง
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            <Truck className="w-3 h-3 mr-1" />
            จัดส่งแล้ว
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            สำเร็จ
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="w-3 h-3 mr-1" />
            ยกเลิก
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-primary" />
      </div>
    );
  }

  // Block rejected members
  if (profile?.approval_status === 'rejected') {
    return <RejectedMemberMessage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* Header */}
      <PageHeader
        title="ประวัติการแลกของรางวัล"
        subtitle={`${redemptions.length} รายการ`}
      />

      <main className="container mx-auto px-4 py-6">
        {redemptions.length === 0 ? (
          <EmptyState
            icon={Package}
            title="ยังไม่มีประวัติการแลก"
            description="เริ่มสะสมคะแนนและแลกของรางวัลกันเลย!"
            actionLabel="ดูของรางวัล"
            onAction={() => navigate('/rewards')}
          />
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <Card key={redemption.id} className="card-hover overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-4">
                    {/* Reward Image */}
                    <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                      {redemption.rewards?.image_url ? (
                        <img
                          src={redemption.rewards.image_url}
                          alt={redemption.rewards.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold truncate">
                          {redemption.rewards?.name || 'ของรางวัล'}
                        </h3>
                        {getStatusBadge(redemption.status)}
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        ใช้ {redemption.points_spent.toLocaleString()} คะแนน
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {new Date(redemption.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {redemption.tracking_number && (
                        <p className="text-xs text-primary mt-2">
                          หมายเลขติดตาม: {redemption.tracking_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {redemption.shipping_address && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">ที่อยู่จัดส่ง</p>
                        <p className="text-sm">{redemption.shipping_address}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
