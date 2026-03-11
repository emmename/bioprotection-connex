import { CalendarCheck, BookOpen, Video, HelpCircle, Receipt, ChevronRight, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DailyMissionsCardProps {
  todayCheckin: boolean;
  onCheckin: () => Promise<unknown>;
  isLoading?: boolean;
  receiptUploadedToday?: boolean;
  articleReadToday?: boolean;
  videoWatchedToday?: boolean;
  quizCompletedToday?: boolean;
}

interface Mission {
  id: string;
  icon: string;
  title: string;
  reward: string;
  rewardType: 'coins' | 'points';
  isCompleted: boolean;
  action?: () => void;
  href?: string;
}

import dailyMissionIcon from '@/assets/new_icons/goal_1338410.svg';
import articleIcon from '@/assets/buttons/article_chick03_256.png';
import videoIcon from '@/assets/buttons/vdo_mumu01_256.png';
import quizIcon from '@/assets/buttons/quiz_chick02_256.png';
import receiptIcon from '@/assets/buttons/receipt_mumu01_256.png';

export function DailyMissionsCard({ todayCheckin, onCheckin, isLoading, receiptUploadedToday = false, articleReadToday = false, videoWatchedToday = false, quizCompletedToday = false }: DailyMissionsCardProps) {
  const missions: Mission[] = [

    {
      id: 'article',
      icon: articleIcon,
      title: 'อ่านบทความ 1 บทความ',
      reward: '+10',
      rewardType: 'points',
      isCompleted: articleReadToday,
      href: '/content?type=article',
    },
    {
      id: 'video',
      icon: videoIcon,
      title: 'ดูวิดีโอ 1 เรื่อง',
      reward: '+15',
      rewardType: 'points',
      isCompleted: videoWatchedToday,
      href: '/content?type=video',
    },
    {
      id: 'quiz',
      icon: quizIcon,
      title: 'ทำแบบทดสอบ 1 ข้อ',
      reward: '+20',
      rewardType: 'points',
      isCompleted: quizCompletedToday,
      href: '/content?type=quiz',
    },
    {
      id: 'receipt',
      icon: receiptIcon,
      title: 'อัปโหลดใบเสร็จ',
      reward: '+50',
      rewardType: 'points',
      isCompleted: receiptUploadedToday,
      href: '/receipts/upload',
    },
  ];

  return (
    <Card className="shadow-md">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <img src={dailyMissionIcon} alt="Mission" className="w-6 h-6" /> ภารกิจประจำวัน
        </CardTitle>
        <Link to="/missions" className="text-sm text-primary hover:underline flex items-center">
          ดูทั้งหมด <ChevronRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {missions.map((mission) => {
          const content = (
            <div
              className={`flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 active:scale-[0.98] ${mission.isCompleted
                ? 'bg-green-50/70 border border-green-200 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm border border-slate-100'
                }`}
            >
              <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 ${mission.isCompleted ? 'bg-green-100' : 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] group-hover:scale-105'
                }`}>
                <img src={mission.icon} alt={mission.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${mission.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {mission.title}
                </p>
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
              <Link key={mission.id} to={mission.href} className="block group">
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
