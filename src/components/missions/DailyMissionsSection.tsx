import { Check, Loader2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import dailyMissionIcon from '@/assets/new_icons/goal_1338410.svg';
import dailyCheckinIcon from '@/assets/new_icons/daily_check-in.svg';
import articleIcon from '@/assets/buttons/article_chick03_256.png';
import videoIcon from '@/assets/buttons/vdo_mumu01_256.png';
import quizIcon from '@/assets/buttons/quiz_chick02_256.png';
import receiptIcon from '@/assets/buttons/receipt_mumu01_256.png';

interface DailyMissionsSectionProps {
  todayCheckin: boolean;
  onCheckin: () => Promise<unknown>;
  isLoading?: boolean;
  receiptUploadedToday: boolean;
  articleReadToday: boolean;
  videoWatchedToday: boolean;
  quizCompletedToday: boolean;
}

interface Mission {
  id: string;
  icon: string;
  title: string;
  description: string;
  reward: string;
  rewardType: 'coins' | 'points';
  isCompleted: boolean;
  action?: () => void;
  href?: string;
}

export function DailyMissionsSection({
  todayCheckin,
  onCheckin,
  isLoading,
  receiptUploadedToday,
  articleReadToday,
  videoWatchedToday,
  quizCompletedToday,
}: DailyMissionsSectionProps) {
  const missions: Mission[] = [
    {
      id: 'checkin',
      icon: dailyCheckinIcon,
      title: 'เช็คอินรายวัน',
      description: 'กดเช็คอินเพื่อรับเหรียญทุกวัน',
      reward: '+5',
      rewardType: 'coins',
      isCompleted: todayCheckin,
      action: onCheckin,
    },
    {
      id: 'article',
      icon: articleIcon,
      title: 'อ่านบทความ 1 บทความ',
      description: 'อ่านบทความจนจบเพื่อรับคะแนน',
      reward: '+10',
      rewardType: 'points',
      isCompleted: articleReadToday,
      href: '/content?type=article',
    },
    {
      id: 'video',
      icon: videoIcon,
      title: 'ดูวิดีโอ 1 เรื่อง',
      description: 'ดูวิดีโอจนจบ 90% ขึ้นไป',
      reward: '+15',
      rewardType: 'points',
      isCompleted: videoWatchedToday,
      href: '/content?type=video',
    },
    {
      id: 'quiz',
      icon: quizIcon,
      title: 'ทำแบบทดสอบ 1 ข้อ',
      description: 'ทำแบบทดสอบเพื่อรับคะแนน',
      reward: '+20',
      rewardType: 'points',
      isCompleted: quizCompletedToday,
      href: '/content?type=quiz',
    },
    {
      id: 'receipt',
      icon: receiptIcon,
      title: 'อัปโหลดใบเสร็จ',
      description: 'อัปโหลดใบเสร็จครั้งแรกของวัน',
      reward: '+50',
      rewardType: 'points',
      isCompleted: receiptUploadedToday,
      href: '/receipts/upload',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <img src={dailyMissionIcon} alt="Mission" className="w-6 h-6" /> ภารกิจประจำวัน
        </CardTitle>
        <p className="text-sm text-muted-foreground">ทำภารกิจทุกวันเพื่อสะสมคะแนนและเหรียญ</p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {missions.map((mission) => {
          const content = (
            <div
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${mission.isCompleted
                ? 'bg-green-50 border border-green-200'
                : 'bg-slate-100 hover:bg-slate-200'
                }`}
            >
              <div className="shrink-0 w-8 h-8 flex items-center justify-center flex-shrink-0">
                <img src={mission.icon} alt={mission.title} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${mission.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {mission.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{mission.description}</p>
                <Badge variant="secondary" className={`text-xs mt-1 ${mission.rewardType === 'coins' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  {mission.reward} {mission.rewardType === 'coins' ? '🪙' : '⭐'}
                </Badge>
              </div>
              <div className="flex-shrink-0">
                {mission.isCompleted ? (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                ) : mission.action ? (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={(e) => {
                      e.preventDefault();
                      mission.action?.();
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'รับ'}
                  </Button>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          );

          if (mission.href && !mission.isCompleted) {
            return (
              <Link key={mission.id} to={mission.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={mission.id}>{content}</div>;
        })}
      </CardContent>
    </Card>
  );
}
