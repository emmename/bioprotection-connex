import { useState, useEffect } from 'react';
import { Bell, History, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import bioprotectionLogo from '@/assets/bioprotection-logo.png';

interface Profile {
  id: string;
  nickname?: string | null;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  member_id?: string | null;
  tier: string;
}

interface DashboardHeaderProps {
  profile: Profile;
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const displayName = profile.nickname || profile.first_name;
  const initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();

  useEffect(() => {
    if (profile?.id) {
      fetchUnreadCount();

      // Subscribe to realtime changes
      const channel = supabase
        .channel('notifications-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `profile_id=eq.${profile.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const fetchUnreadCount = async () => {
    if (!profile?.id) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Avatar & Welcome Text */}
          <div className="flex items-center gap-3">
            <div>
              <Avatar className="w-[72px] h-[72px] border-2 border-primary/20">
                <AvatarImage src={bioprotectionLogo} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  <img src={bioprotectionLogo} alt="Bioprotection Connex" className="w-full h-full object-cover" />
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome Back</p>
              <p className="text-lg font-bold flex items-center gap-1.5">
                ยินดีต้อนรับ <span>👋</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* History Button */}
            <Button variant="ghost" size="icon" asChild>
              <Link to="/history">
                <History className="w-5 h-5" />
              </Link>
            </Button>

            {/* Settings Button */}
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="w-5 h-5" />
              </Link>
            </Button>

            {/* Notification Bell */}
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/notifications">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
