import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    subtitleClassName?: string;
    showBack?: boolean;
    onBack?: () => void;
    className?: string;
    children?: React.ReactNode;
}

export function PageHeader({
    title,
    subtitle,
    subtitleClassName,
    showBack = true,
    onBack,
    className,
    children
}: PageHeaderProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <header className={cn("sticky top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border/50", className)}>
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center gap-4">
                    {showBack && (
                        <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate">{title}</h1>
                        {subtitle && (
                            <p className={cn("text-sm opacity-80 truncate", subtitleClassName)}>{subtitle}</p>
                        )}
                    </div>
                    {children}
                </div>
            </div>
        </header>
    );
}
