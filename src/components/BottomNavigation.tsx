import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import homeIcon from '@/assets/new_icons/home_10233170.svg';
import contentIcon from '@/assets/new_icons/align-text_9192270.svg';
import gameIcon from '@/assets/new_icons/gamepad_11429876.svg';
import rewardIcon from '@/assets/new_icons/star_4820830.svg';
import userIcon from '@/assets/new_icons/user_9572778.svg';

interface NavItem {
  iconSrc: string;
  label: string;
  href: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  {
    iconSrc: homeIcon,
    label: 'หน้าหลัก',
    href: '/dashboard',
    matchPaths: ['/dashboard']
  },
  {
    iconSrc: contentIcon,
    label: 'คอนเทนต์',
    href: '/content',
    matchPaths: ['/content']
  },
  {
    iconSrc: gameIcon,
    label: 'เล่นเกม',
    href: '/games',
    matchPaths: ['/games']
  },
  {
    iconSrc: rewardIcon,
    label: 'แลกรางวัล',
    href: '/rewards',
    matchPaths: ['/rewards', '/my-redemptions']
  },
  {
    iconSrc: userIcon,
    label: 'โปรไฟล์',
    href: '/profile',
    matchPaths: ['/profile', '/settings']
  },
];

export function BottomNavigation() {
  const location = useLocation();

  const isActive = (item: NavItem) => {
    return item.matchPaths?.some(path => location.pathname.startsWith(path)) || false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 pb-safe max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-2 rounded-xl transition-colors',
                active && 'bg-primary/10'
              )}>
                <img
                  src={item.iconSrc}
                  alt={item.label}
                  className={cn('w-6 h-6', active ? 'opacity-100' : 'opacity-80')}
                />
              </div>
              <span className={cn(
                'text-[10px]',
                active ? 'font-semibold' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
