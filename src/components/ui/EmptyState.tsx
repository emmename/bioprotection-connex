import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center px-4", className)}>
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" className="min-w-[140px]">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
