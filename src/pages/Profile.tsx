import { useState, useEffect, useMemo, useRef } from 'react';
import memberCardBg from '@/assets/bg_card/member_profile_card.png';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, User, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BottomNavigation } from '@/components/BottomNavigation';
import {
  getProvinces,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCodeBySubdistrict,
} from '@/lib/thai-address-data';

interface ProfileData {
  nickname: string;
  first_name: string;
  last_name: string;
  phone: string;
  line_id: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  avatar_url: string;
}

const memberTypeLabels: Record<string, string> = {
  farm: 'ฟาร์มเลี้ยงสัตว์',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านค้าสินค้าปศุสัตว์',
  government: 'รับราชการ',
  other: 'อื่นๆ'
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [data, setData] = useState<ProfileData>({
    nickname: '',
    first_name: '',
    last_name: '',
    phone: '',
    line_id: '',
    address: '',
    province: '',
    district: '',
    subdistrict: '',
    postal_code: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (!user) return;

    const fetchFullProfile = async () => {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast({
          title: 'ไม่สามารถโหลดข้อมูลได้',
          description: 'กรุณาลองใหม่อีกครั้ง',
          variant: 'destructive',
        });
        return;
      }

      if (profileData) {
        setData({
          nickname: profileData.nickname || '',
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          line_id: profileData.line_id || '',
          address: profileData.address || '',
          province: profileData.province || '',
          district: profileData.district || '',
          subdistrict: profileData.subdistrict || '',
          postal_code: profileData.postal_code || '',
          avatar_url: profileData.avatar_url || '',
        });
      }
      setIsLoading(false);
    };

    fetchFullProfile();
  }, [user, navigate, toast]);

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(
    () => (data.province ? getDistrictsByProvince(data.province) : []),
    [data.province]
  );
  const subdistricts = useMemo(
    () => (data.district ? getSubdistrictsByDistrict(data.province, data.district).map(s => s.name) : []),
    [data.province, data.district]
  );

  const handleProvinceChange = (value: string) => {
    setData(prev => ({
      ...prev,
      province: value,
      district: '',
      subdistrict: '',
      postal_code: '',
    }));
  };

  const handleDistrictChange = (value: string) => {
    setData(prev => ({
      ...prev,
      district: value,
      subdistrict: '',
      postal_code: '',
    }));
  };

  const handleSubdistrictChange = (value: string) => {
    const postalCode = getPostalCodeBySubdistrict(data.province, data.district, value);
    setData(prev => ({
      ...prev,
      subdistrict: value,
      postal_code: postalCode || '',
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'ไฟล์ไม่ถูกต้อง',
        description: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'ไฟล์ใหญ่เกินไป',
        description: 'กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setData(prev => ({ ...prev, avatar_url: avatarUrl }));
      await refreshProfile();

      toast({
        title: 'อัปโหลดสำเร็จ',
        description: 'รูปโปรไฟล์ของคุณได้รับการอัปเดตแล้ว',
      });
    } catch (error) {
      toast({
        title: 'ไม่สามารถอัปโหลดได้',
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: data.nickname || null,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        line_id: data.line_id || null,
        address: data.address || null,
        province: data.province || null,
        district: data.district || null,
        subdistrict: data.subdistrict || null,
        postal_code: data.postal_code || null,
      })
      .eq('id', profile.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'ไม่สามารถบันทึกข้อมูลได้',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    await refreshProfile();
    toast({
      title: 'บันทึกสำเร็จ',
      description: 'ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว',
    });
  };

  const initials = data.first_name && data.last_name
    ? `${data.first_name[0]}${data.last_name[0]}`.toUpperCase()
    : 'U';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-white/10"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">โปรไฟล์ของฉัน</h1>
              <p className="text-xs text-white/70">ดูและแก้ไขข้อมูลส่วนตัว</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl pb-24">
        {/* Member Card */}
        <Card className="mb-6 overflow-hidden relative border-none shadow-xl rounded-3xl w-full sm:min-h-[225px]">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-center bg-cover bg-no-repeat scale-[1.00]"
            style={{ backgroundImage: `url(${memberCardBg})` }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0" />
          
          <CardContent className="relative text-white px-5 pt-2 pb-3 sm:px-6 sm:pt-3 sm:pb-4 flex flex-col gap-2">
            {/* Row 1: Top metadata badges */}
            <div className="flex items-start justify-between gap-2">
              {/* Member ID */}
              {profile?.member_id ? (
                <div className="bg-black/5 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-white/90 leading-none mb-0.5">รหัสสมาชิก</p>
                  <p className="text-xs font-bold text-white/100 leading-tight">{profile.member_id}</p>
                </div>
              ) : <div />}
              {/* Member Since */}
              <div className="bg-black/5 backdrop-blur-sm px-3 py-1.5 rounded-xl text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/90 leading-none mb-0.5">สมาชิกตั้งแต่</p>
                <p className="text-xs font-bold text-white/100 leading-tight">
                  {profile?.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: th }) : '-'}
                </p>
              </div>
            </div>

            {/* Row 2: Avatar + Identity (responsive: column on mobile, row on landscape) */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="relative shrink-0 group/avatar">
                <Avatar className="w-20 h-20 sm:w-[90px] sm:h-[90px] ring-[3px] ring-white/80 shadow-lg">
                  <AvatarImage src={data.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold backdrop-blur-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-0.5 -right-0.5 rounded-full w-7 h-7 bg-white text-[#0066cc] hover:bg-gray-100 shadow-md p-0 transition-transform hover:scale-110 border-2 border-white"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {/* Name + Type + QR */}
              <div className="flex flex-col items-center sm:items-start gap-2 min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0)] leading-tight truncate max-w-full">
                  {data.first_name} {data.last_name}
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold bg-white/15 backdrop-blur-sm px-3.5 py-1 rounded-full text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {memberTypeLabels[profile?.member_type as keyof typeof memberTypeLabels] || profile?.member_type || 'สมาชิก'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-1 h-9 px-5 bg-white text-[#0066cc] font-bold text-xs rounded-full shadow-md hover:bg-gray-50 hover:shadow-lg active:scale-[0.97] transition-all duration-200 border-none group/qr"
                  onClick={() => navigate('/my-qr')}
                >
                  <QrCode className="w-4 h-4 mr-1.5 transition-transform group-hover/qr:rotate-12" />
                  QR ของฉัน
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nickname">ชื่อเล่น</Label>
              <Input
                id="nickname"
                value={data.nickname}
                onChange={e => setData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="ชื่อเล่น (ไม่บังคับ)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">ชื่อจริง *</Label>
                <Input
                  id="first_name"
                  value={data.first_name}
                  onChange={e => setData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="ชื่อจริง"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">นามสกุล *</Label>
                <Input
                  id="last_name"
                  value={data.last_name}
                  onChange={e => setData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="นามสกุล"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={e => setData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0812345678"
                />
              </div>
              <div>
                <Label htmlFor="line_id">Line ID</Label>
                <Input
                  id="line_id"
                  value={data.line_id}
                  onChange={e => setData(prev => ({ ...prev, line_id: e.target.value }))}
                  placeholder="Line ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">ที่อยู่</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">ที่อยู่</Label>
              <Input
                id="address"
                value={data.address}
                onChange={e => setData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="บ้านเลขที่ ซอย ถนน"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>จังหวัด</Label>
                <Select value={data.province} onValueChange={handleProvinceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกจังหวัด" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>อำเภอ/เขต</Label>
                <Select
                  value={data.district}
                  onValueChange={handleDistrictChange}
                  disabled={!data.province}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกอำเภอ/เขต" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ตำบล/แขวง</Label>
                <Select
                  value={data.subdistrict}
                  onValueChange={handleSubdistrictChange}
                  disabled={!data.district}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกตำบล/แขวง" />
                  </SelectTrigger>
                  <SelectContent>
                    {subdistricts.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>รหัสไปรษณีย์</Label>
                <Input
                  value={data.postal_code}
                  readOnly
                  className="bg-muted"
                  placeholder="รหัสไปรษณีย์"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          className="w-full gradient-accent text-accent-foreground"
          size="lg"
          onClick={handleSave}
          disabled={isSaving || !data.first_name || !data.last_name}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              บันทึกข้อมูล
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
