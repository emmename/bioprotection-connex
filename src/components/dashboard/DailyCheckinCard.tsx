import { Coins, Check, Gift, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDailyCheckin } from '@/hooks/useGamification';

import dailyCheckinIcon from '@/assets/new_icons/daily_check-in.svg';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import dailyCheckinSuccessImage from '@/assets/11.png';

export function DailyCheckinCard() {
  const { todayCheckin, streak, isLoading, checkin } = useDailyCheckin();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const currentDay = (streak % 7) || 0;
  // If checked in today, currentDay is the day we just finished. 
  // If not, streak is from yesterday, so next day is (streak + 1)

  // Logic adjustment:
  // If todayCheckin exists: streak includes today. e.g. streak 1 means Day 1 done.
  // If no todayCheckin: streak is yesterday's. e.g. streak 0 means Day 1 is next.

  const displayDay = todayCheckin ? (currentDay === 0 ? 7 : currentDay) : ((currentDay + 1) > 7 ? 1 : currentDay + 1);

  const days = [1, 2, 3, 4, 5, 6, 7];

  const handleCheckin = async () => {
    const success = await checkin();
    if (success) {
      setShowSuccessModal(true);
    }
  };

  return (
    <>
      <Card className="card-hover shadow-md">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={dailyCheckinIcon} alt="Check-in" className="w-6 h-6" />
              <span>เช็คอินรายวัน</span>
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              ต่อเนื่อง {streak} วัน
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative">
            {/* Progress Line Background */}
            <div className="absolute top-[2.4rem] left-0 w-full h-[6px] bg-slate-200 rounded-full -z-10" />

            {/* Active Progress Line (calculated width based on streak) */}
            <div
              className="absolute top-[2.4rem] left-0 h-[6px] bg-green-200 rounded-full -z-10 transition-all duration-500"
              style={{
                width: `${Math.min(((streak % 7 || 7) - 0.5) / 7 * 100, 100)}%`
              }}
            />

            <div className="grid grid-cols-7 gap-0 relative">
              {days.map((day) => {
                let status = 'upcoming'; // default

                // Logic to determine status of each day bubble
                if (todayCheckin) {
                  const cycleStreak = streak % 7 === 0 ? 7 : streak % 7;
                  if (day <= cycleStreak) status = 'completed';
                } else {
                  const yesterStreak = streak % 7;
                  if (day <= yesterStreak) status = 'completed';
                  else if (day === yesterStreak + 1) status = 'current';
                }

                const isGiftDay = day === 7;
                const rewardAmount = isGiftDay ? 50 : 5;

                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div className="text-[10px] text-muted-foreground font-medium">วันที่ {day}</div>
                    <div
                      className={`
                      w-9 h-9 rounded-full flex items-center justify-center border-2 z-10 transition-all shadow-sm
                      ${status === 'completed' ? 'bg-green-500 border-green-500 text-white shadow-green-200' : ''}
                      ${status === 'current' ? 'bg-white border-primary text-primary ring-4 ring-primary/10 scale-110' : ''}
                      ${status === 'upcoming' ? 'bg-white border-slate-200 text-slate-300' : ''}
                    `}
                    >
                      {status === 'completed' ? (
                        <Check className="w-5 h-5" />
                      ) : isGiftDay ? (
                        <Gift className={`w-5 h-5 ${status === 'upcoming' ? '' : 'text-amber-500'}`} />
                      ) : (
                        <Coins className="w-4 h-4" />
                      )}
                    </div>
                    <div className={`text-[10px] font-bold ${status === 'completed' || status === 'current' ? 'text-amber-600' : 'text-slate-300'}`}>+{rewardAmount}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            className={`w-full mt-4 transition-transform active:scale-95 ${todayCheckin ? 'bg-muted text-muted-foreground' : 'gradient-primary text-white'}`}
            onClick={handleCheckin}
            disabled={!!todayCheckin || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : todayCheckin ? (
              <>
                <Check className="w-5 h-5 mr-2 animate-bounce-in" />
                เช็คอินเรียบร้อย
              </>
            ) : (
              <>
                เช็คอินรับ {days[(streak % 7)] === 7 ? 50 : 5} เหรียญ
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <img
              src={dailyCheckinSuccessImage}
              alt="Check-in Successful"
              className="w-48 h-auto object-contain animate-bounce-in"
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-primary">เช็คอินสำเร็จ!</h2>
              <p className="text-muted-foreground">
                ยินดีด้วย! คุณได้รับเหรียญจากการเช็คอินวันนี้
              </p>
            </div>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full mt-4">
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
