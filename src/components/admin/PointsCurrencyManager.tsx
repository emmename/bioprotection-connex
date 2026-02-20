import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Minus, Award, Coins, Loader2 } from 'lucide-react';

interface PointsCurrencyManagerProps {
  profileId: string;
  currentPoints: number;
  currentCoins: number;
  onUpdate: () => void;
}

type ActionType = 'add_points' | 'deduct_points' | 'add_coins' | 'deduct_coins';

export function PointsCurrencyManager({
  profileId,
  currentPoints,
  currentCoins,
  onUpdate,
}: PointsCurrencyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('add_points');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const actionConfig = {
    add_points: {
      title: 'เพิ่มคะแนน',
      icon: Award,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      buttonVariant: 'default' as const,
    },
    deduct_points: {
      title: 'ลบคะแนน',
      icon: Award,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      buttonVariant: 'destructive' as const,
    },
    add_coins: {
      title: 'เพิ่มเหรียญ',
      icon: Coins,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
      buttonVariant: 'default' as const,
    },
    deduct_coins: {
      title: 'ลบเหรียญ',
      icon: Coins,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      buttonVariant: 'destructive' as const,
    },
  };

  const handleAction = async () => {
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      toast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'กรุณาระบุจำนวนที่มากกว่า 0',
        variant: 'destructive',
      });
      return;
    }

    // Validate deduction amounts
    if (actionType === 'deduct_points' && parsedAmount > currentPoints) {
      toast({
        title: 'คะแนนไม่เพียงพอ',
        description: `สมาชิกมีคะแนน ${currentPoints} คะแนน ไม่สามารถลบ ${parsedAmount} คะแนนได้`,
        variant: 'destructive',
      });
      return;
    }

    if (actionType === 'deduct_coins' && parsedAmount > currentCoins) {
      toast({
        title: 'เหรียญไม่เพียงพอ',
        description: `สมาชิกมีเหรียญ ${currentCoins} เหรียญ ไม่สามารถลบ ${parsedAmount} เหรียญได้`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      let error;

      if (actionType === 'add_points') {
        const result = await supabase.rpc('add_points', {
          p_profile_id: profileId,
          p_amount: parsedAmount,
          p_source: 'admin_adjustment',
          p_description: description || 'Admin เพิ่มคะแนน',
        });
        error = result.error;
      } else if (actionType === 'deduct_points') {
        const result = await supabase.rpc('deduct_points', {
          p_profile_id: profileId,
          p_amount: parsedAmount,
          p_source: 'admin_adjustment',
          p_description: description || 'Admin ลบคะแนน',
        });
        error = result.error;
      } else if (actionType === 'add_coins') {
        const result = await supabase.rpc('add_coins', {
          p_profile_id: profileId,
          p_amount: parsedAmount,
          p_source: 'admin_adjustment',
          p_description: description || 'Admin เพิ่มเหรียญ',
        });
        error = result.error;
      } else if (actionType === 'deduct_coins') {
        const result = await supabase.rpc('deduct_coins', {
          p_profile_id: profileId,
          p_amount: parsedAmount,
          p_source: 'admin_adjustment',
          p_description: description || 'Admin ลบเหรียญ',
        });
        error = result.error;
      }

      if (error) {
        throw error;
      }

      toast({
        title: 'สำเร็จ',
        description: `${actionConfig[actionType].title} ${parsedAmount.toLocaleString()} เรียบร้อยแล้ว`,
      });

      setAmount('');
      setDescription('');
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating currency:', error);
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'ไม่สามารถดำเนินการได้';
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (type: ActionType) => {
    setActionType(type);
    setAmount('');
    setDescription('');
    setIsOpen(true);
  };

  const config = actionConfig[actionType];
  const Icon = config.icon;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('add_points')}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          <Award className="w-4 h-4" />
          เพิ่มคะแนน
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('deduct_points')}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Minus className="w-4 h-4" />
          <Award className="w-4 h-4" />
          ลบคะแนน
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('add_coins')}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          <Coins className="w-4 h-4" />
          เพิ่มเหรียญ
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('deduct_coins')}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Minus className="w-4 h-4" />
          <Coins className="w-4 h-4" />
          ลบเหรียญ
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              {config.title}
            </DialogTitle>
            <DialogDescription>
              {actionType.includes('points')
                ? `คะแนนปัจจุบัน: ${currentPoints.toLocaleString()} คะแนน`
                : `เหรียญปัจจุบัน: ${currentCoins.toLocaleString()} เหรียญ`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                จำนวน {actionType.includes('points') ? 'คะแนน' : 'เหรียญ'}
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                placeholder="ระบุจำนวน"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="description"
                placeholder="ระบุเหตุผลในการปรับ"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              ยกเลิก
            </Button>
            <Button
              variant={config.buttonVariant}
              onClick={handleAction}
              disabled={isLoading || !amount}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
