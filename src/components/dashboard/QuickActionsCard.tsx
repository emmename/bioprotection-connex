import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import articleButtonImg from '@/assets/buttons/article_chick03_256.png';
import vdoButtonImg from '@/assets/buttons/vdo_mumu01_256.png';
import quizButtonImg from '@/assets/buttons/quiz_chick02_256.png';
import surveyButtonImg from '@/assets/buttons/quiz_pig01_256.png';
import uploadButtonImg from '@/assets/buttons/receipt_mumu01_256.png';
import scanButtonImg from '@/assets/buttons/scan_chick01_256.png';
import rewardButtonImg from '@/assets/buttons/reward_mumu01_256.png';
import missionButtonImg from '@/assets/buttons/mission_chick01_256.png';

interface QuickAction {
  label: string;
  href: string;
  imageSrc: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'บทความ',
    href: '/content?type=article',
    imageSrc: articleButtonImg,
  },
  {
    label: 'วิดีโอ',
    href: '/content?type=video',
    imageSrc: vdoButtonImg,
  },
  {
    label: 'แบบทดสอบ',
    href: '/content?type=quiz',
    imageSrc: quizButtonImg,
  },
  {
    label: 'แบบสำรวจ',
    href: '/content?type=survey',
    imageSrc: surveyButtonImg,
  },
  {
    label: 'อัปโหลดใบเสร็จ',
    href: '/receipts/upload',
    imageSrc: uploadButtonImg,
  },
  {
    label: 'สแกน QR',
    href: '/coming-soon',
    imageSrc: scanButtonImg,
  },
  {
    label: 'แลกรางวัล',
    href: '/rewards',
    imageSrc: rewardButtonImg,
  },
  {
    label: 'ภารกิจ',
    href: '/missions',
    imageSrc: missionButtonImg,
  },
];

import menuIcon from '@/assets/new_icons/open-menu_10024187.svg';

export function QuickActionsCard() {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <img src={menuIcon} alt="Menu" className="w-6 h-6" /> เมนูลัด
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="group flex flex-col items-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mb-2 group-hover:scale-110 transition-transform overflow-hidden rounded-2xl flex-shrink-0">
                <img
                  src={action.imageSrc}
                  alt={action.label}
                  className={`w-full h-full object-cover ${action.label === 'แบบทดสอบ' ? 'scale-90' : ''}`}
                />
              </div>
              <span className="text-xs font-medium text-center leading-tight line-clamp-2 min-h-[2.5em] flex items-start justify-center">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
