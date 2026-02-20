import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Shield, Trophy, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import bioprotectionLogo from '@/assets/bioprotection-logo_256.png';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [isVerifyingToken, setIsVerifyingToken] = useState(false);

  // Check for password reset mode from URL and verify the recovery token
  useEffect(() => {
    const handlePasswordReset = async () => {
      // Check if we have a recovery token in the URL hash (Supabase sends it this way)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      // Also check query params for reset=true (our redirect indicator)
      const isResetMode = searchParams.get('reset') === 'true';

      if (type === 'recovery' && accessToken) {
        setIsVerifyingToken(true);
        try {
          // Set the session using the recovery token from the email link
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            toast.error('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
          } else {
            setShowResetPassword(true);
            // Clear the hash from URL for cleaner look
            window.history.replaceState(null, '', window.location.pathname + '?reset=true');
          }
        } catch (err) {
          console.error('Error during token verification:', err);
          toast.error('เกิดข้อผิดพลาดในการตรวจสอบลิงก์');
        }
        setIsVerifyingToken(false);
      } else if (isResetMode) {
        // User is on reset page but check if session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setShowResetPassword(true);
        } else {
          toast.error('กรุณาคลิกลิงก์รีเซ็ตรหัสผ่านจากอีเมลอีกครั้ง');
          setShowResetPassword(false);
        }
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && !showResetPassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate, showResetPassword]);

  // Show loading while checking auth OR if user is logged in (waiting for redirect) OR verifying token
  if (authLoading || (user && !showResetPassword) || isVerifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          {isVerifyingToken && (
            <p className="mt-4 text-muted-foreground">กำลังตรวจสอบลิงก์รีเซ็ตรหัสผ่าน...</p>
          )}
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast.error('เข้าสู่ระบบไม่สำเร็จ: ' + error.message);
    } else {
      // Save or remove email based on remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      toast.success('เข้าสู่ระบบสำเร็จ!');
      // useEffect จะ handle redirect อัตโนมัติ
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('อีเมลนี้ถูกใช้งานแล้ว');
      } else {
        toast.error('สมัครสมาชิกไม่สำเร็จ: ' + error.message);
      }
    } else {
      toast.success('สมัครสมาชิกสำเร็จ! กำลังไปหน้าลงทะเบียน...');
      navigate('/register');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('กรุณากรอกอีเมล');
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast.error('ส่งอีเมลไม่สำเร็จ: ' + error.message);
    } else {
      toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
      setShowForgotPassword(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('กรุณากรอกรหัสผ่านใหม่');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);

    if (error) {
      toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + error.message);
    } else {
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ!');
      setShowResetPassword(false);
      navigate('/dashboard', { replace: true });
    }
  };

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm animate-slide-up">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl shadow-xl mb-4 mx-auto">
                <Mail className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">ลืมรหัสผ่าน</CardTitle>
              <CardDescription>
                กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">อีเมล</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      กำลังส่ง...
                    </div>
                  ) : (
                    'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  กลับไปหน้าเข้าสู่ระบบ
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset Password View (after clicking email link)
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm animate-slide-up">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-2xl shadow-xl mb-4 mx-auto">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl">ตั้งรหัสผ่านใหม่</CardTitle>
              <CardDescription>
                กรุณากรอกรหัสผ่านใหม่ของคุณ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="transition-all focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      กำลังบันทึก...
                    </div>
                  ) : (
                    'ตั้งรหัสผ่านใหม่'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-secondary/20 rounded-full blur-2xl animate-pulse-glow" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex justify-center mb-4 animate-bounce-subtle">
            <img src={bioprotectionLogo} alt="Bioprotection Connex" className="w-40 h-40 object-contain drop-shadow-xl" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Bioprotection <span className="text-primary">Connex</span>
          </h1>
          <p className="text-muted-foreground mt-2">ระบบสมาชิก Elanco</p>
        </div>

        {/* Features highlight */}
        <div className="flex justify-center gap-6 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs text-muted-foreground">สะสมแต้ม</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5 text-warning" />
            </div>
            <span className="text-xs text-muted-foreground">เล่นเกมส์</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">แลกรางวัล</span>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  เข้าสู่ระบบ
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  สมัครสมาชิก
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">อีเมล</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">รหัสผ่าน</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="transition-all focus:ring-2 focus:ring-primary/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember me & Forgot password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                      />
                      <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                        จดจำอีเมล
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-primary hover:text-primary-hover"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      ลืมรหัสผ่าน?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        กำลังเข้าสู่ระบบ...
                      </div>
                    ) : (
                      'เข้าสู่ระบบ'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">อีเมล</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="transition-all focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">รหัสผ่าน</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="transition-all focus:ring-2 focus:ring-primary/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        กำลังสมัครสมาชิก...
                      </div>
                    ) : (
                      'สมัครสมาชิก'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          © 2024 Elanco Animal Health. All rights reserved.
        </p>
      </div>
    </div>
  );
}
