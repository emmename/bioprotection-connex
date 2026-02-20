import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Bell, Shield, Eye, EyeOff, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';


export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pointsNotifications, setPointsNotifications] = useState(true);
  const [promotionNotifications, setPromotionNotifications] = useState(true);
  const [activityNotifications, setActivityNotifications] = useState(true);


  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณาตรวจสอบรหัสผ่านใหม่และยืนยันรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "เปลี่ยนรหัสผ่านสำเร็จ",
        description: "รหัสผ่านของคุณได้รับการอัปเดตแล้ว",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนรหัสผ่านได้",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveNotifications = () => {
    toast({
      title: "บันทึกการตั้งค่าแล้ว",
      description: "การตั้งค่าการแจ้งเตือนได้รับการอัปเดตแล้ว",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">ตั้งค่า</h1>
              <p className="text-xs text-white/70">จัดการบัญชีและการแจ้งเตือน</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Password Change Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">เปลี่ยนรหัสผ่าน</CardTitle>
            </div>
            <CardDescription>
              อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="w-full"
            >
              {isChangingPassword ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">การแจ้งเตือน</CardTitle>
            </div>
            <CardDescription>
              จัดการการแจ้งเตือนที่คุณต้องการรับ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>การแจ้งเตือนทางอีเมล</Label>
                <p className="text-sm text-muted-foreground">
                  รับการแจ้งเตือนผ่านทางอีเมล
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>แต้มและเหรียญ</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่อได้รับแต้มหรือเหรียญใหม่
                </p>
              </div>
              <Switch
                checked={pointsNotifications}
                onCheckedChange={setPointsNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>โปรโมชันและกิจกรรม</Label>
                <p className="text-sm text-muted-foreground">
                  รับข่าวสารโปรโมชันและกิจกรรมพิเศษ
                </p>
              </div>
              <Switch
                checked={promotionNotifications}
                onCheckedChange={setPromotionNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ความเคลื่อนไหวบัญชี</Label>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนเมื่อมีการเปลี่ยนแปลงในบัญชี
                </p>
              </div>
              <Switch
                checked={activityNotifications}
                onCheckedChange={setActivityNotifications}
              />
            </div>

            <Button
              onClick={handleSaveNotifications}
              className="w-full mt-4"
            >
              บันทึกการตั้งค่า
            </Button>
          </CardContent>
        </Card>

        {/* Security Info Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">ความปลอดภัย</CardTitle>
            </div>
            <CardDescription>
              ข้อมูลความปลอดภัยของบัญชี
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">อีเมล</span>
              <span className="text-sm font-medium">{user?.email || '-'}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">สถานะบัญชี</span>
              <span className="text-sm font-medium text-green-600">ใช้งานอยู่</span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone / Logout */}
        <div className="pt-4 pb-8">
          <Button
            variant="destructive"
            className="w-full"
            onClick={async () => {
              try {
                await supabase.auth.signOut();
                navigate('/auth');
                toast({
                  title: "ออกจากระบบแล้ว",
                  description: "ไว้เจอกันใหม่นะครับ 👋",
                });
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "เกิดข้อผิดพลาด",
                  description: "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่",
                });
              }
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Version 1.0.0 (Build 2024.1)
          </p>
        </div>
      </main>
    </div>
  );
}
