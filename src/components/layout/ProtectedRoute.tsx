import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/LoadingSkeleton';
import { RejectedMemberMessage } from '@/components/RejectedMemberMessage';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, profile, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !user) {
            navigate('/auth');
        } else if (!isLoading && user && !profile) {
            // User is logged in but has no profile row -> force registration
            navigate('/register', { replace: true });
        }
    }, [user, profile, isLoading, navigate]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (!user) {
        return null; // Will redirect via useEffect
    }

    if (profile?.approval_status === 'rejected') {
        return <RejectedMemberMessage />;
    }

    // Optional: Check if profile is loaded before rendering children to prevent null pointer exceptions
    if (!profile) {
        return null;
    }

    return <>{children}</>;
}
