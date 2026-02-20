import { LucideIcon, Coins, Star, Gift, Trophy, Gamepad2, FileText, Video, ClipboardList, HelpCircle, Users, Settings, BarChart3, Receipt, Megaphone, Calendar, MapPin } from 'lucide-react';

interface TierInfo {
  name: string;
  nameEn: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;
  gradient: string;
  icon: string;
}

export const TIER_INFO: Record<string, TierInfo> = {
  bronze: {
    name: 'Bronze',
    nameEn: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    color: 'tier-bronze',
    gradient: 'gradient-tier-bronze',
    icon: '🥉',
  },
  silver: {
    name: 'Silver',
    nameEn: 'Silver',
    minPoints: 1000,
    maxPoints: 4999,
    color: 'tier-silver',
    gradient: 'gradient-tier-silver',
    icon: '🥈',
  },
  gold: {
    name: 'Gold',
    nameEn: 'Gold',
    minPoints: 5000,
    maxPoints: 9999,
    color: 'tier-gold',
    gradient: 'gradient-tier-gold',
    icon: '🥇',
  },
  platinum: {
    name: 'Platinum',
    nameEn: 'Platinum',
    minPoints: 10000,
    maxPoints: null,
    color: 'tier-platinum',
    gradient: 'gradient-tier-platinum',
    icon: '💎',
  },
};

export function getNextTier(currentTier: string): TierInfo | null {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex === tiers.length - 1) return null;
  return TIER_INFO[tiers[currentIndex + 1]];
}

export function getProgressToNextTier(currentPoints: number, currentTier: string): number {
  const nextTier = getNextTier(currentTier);
  if (!nextTier) return 100;
  
  const currentTierInfo = TIER_INFO[currentTier];
  const range = nextTier.minPoints - currentTierInfo.minPoints;
  const progress = currentPoints - currentTierInfo.minPoints;
  
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return (points / 1000000).toFixed(1) + 'M';
  }
  if (points >= 1000) {
    return (points / 1000).toFixed(1) + 'K';
  }
  return points.toString();
}

export function formatCoins(coins: number): string {
  return formatPoints(coins);
}

export const GAME_TYPES = [
  {
    id: 'matching',
    name: 'จับคู่',
    description: 'จับคู่ภาพที่เหมือนกัน',
    icon: '🎯',
    color: 'game-blue',
  },
  {
    id: 'flip_cards',
    name: 'เปิดป้าย',
    description: 'เปิดการ์ดหาคู่ที่ตรงกัน',
    icon: '🃏',
    color: 'game-green',
  },
  {
    id: 'spin_wheel',
    name: 'หมุนวงล้อ',
    description: 'หมุนวงล้อลุ้นรางวัล',
    icon: '🎡',
    color: 'game-orange',
  },
  {
    id: 'quiz_game',
    name: 'Quiz Game',
    description: 'ตอบคำถามรับรางวัล',
    icon: '📝',
    color: 'game-purple',
  },
];

export const CONTENT_TYPE_INFO = {
  article: { icon: FileText, name: 'บทความ', color: 'text-primary' },
  video: { icon: Video, name: 'วิดีโอ', color: 'text-game-orange' },
  quiz: { icon: HelpCircle, name: 'แบบทดสอบ', color: 'text-game-purple' },
  survey: { icon: ClipboardList, name: 'แบบสำรวจ', color: 'text-game-green' },
};

export const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', icon: BarChart3, label: 'หน้าแรก' },
  { href: '/dashboard/content', icon: FileText, label: 'เนื้อหา' },
  { href: '/dashboard/games', icon: Gamepad2, label: 'เกม' },
  { href: '/dashboard/rewards', icon: Gift, label: 'ของรางวัล' },
  { href: '/dashboard/missions', icon: MapPin, label: 'ภารกิจ' },
  { href: '/dashboard/receipts', icon: Receipt, label: 'อัปโหลดใบเสร็จ' },
];

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/members', icon: Users, label: 'สมาชิก' },
  { href: '/admin/content', icon: FileText, label: 'เนื้อหา' },
  { href: '/admin/rewards', icon: Gift, label: 'ของรางวัล' },
  { href: '/admin/receipts', icon: Receipt, label: 'ใบเสร็จ' },
  { href: '/admin/missions', icon: MapPin, label: 'ภารกิจ' },
  { href: '/admin/settings', icon: Settings, label: 'ตั้งค่า' },
];
