import { useEffect } from 'react';
import tierUpImage from '@/assets/5.png'; // Use requested image
import { Button } from '@/components/ui/button';

interface TierUpCelebrationProps {
  newTier: string;
  onClose: () => void;
}

const tierLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

export function TierUpCelebration({ newTier, onClose }: TierUpCelebrationProps) {
  useEffect(() => {
    // Auto close after 10 seconds if not clicked, but user might want to admire it
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const label = tierLabels[newTier] || newTier;

  // Generate confetti particles
  const confetti = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${6 + Math.random() * 8}px`,
    color: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(330,80%,60%)', 'hsl(50,100%,55%)'][i % 5],
  }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute top-0 rounded-full animate-confetti-fall"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animationDelay: c.delay,
            animationDuration: c.duration,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-sm w-full mx-4 animate-bounce-in bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">

        <div className="relative">
          <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full" />
          <img
            src={tierUpImage}
            alt="Level Up"
            className="w-48 h-auto object-contain relative z-10 drop-shadow-2xl"
          />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-wider drop-shadow-md">
            ยินดีด้วย!
          </h2>
          <p className="text-white/90 text-lg">
            คุณได้เลื่อนระดับเป็น
          </p>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-sm uppercase tracking-widest my-2">
            {label}
          </div>
          <p className="text-white/70 text-sm">
            สิทธิพิเศษมากมายกำลังรอคุณอยู่
          </p>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-white text-primary hover:bg-white/90 font-bold text-lg h-12 rounded-full shadow-lg"
        >
          ตกลง
        </Button>
      </div>
    </div>
  );
}
