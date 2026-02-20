import { BottomNavigation } from '@/components/BottomNavigation';

interface AppLayoutProps {
    children: React.ReactNode;
    showBottomNav?: boolean;
}

export default function AppLayout({ children, showBottomNav = true }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background relative pb-20">
            <div className="mx-auto max-w-md w-full min-h-screen">
                {children}
            </div>
            {showBottomNav && <BottomNavigation />}
        </div>
    );
}
