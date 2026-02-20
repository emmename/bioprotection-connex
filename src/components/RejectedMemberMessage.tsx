import { ShieldX, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getNotApprovedMessage } from '@/lib/approval-logic';

export function RejectedMemberMessage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-destructive">
            ไม่สามารถเข้าใช้งานได้
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getNotApprovedMessage()}
          </p>
          <Button onClick={handleSignOut} variant="outline" className="mt-4">
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
