import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InlineEditField } from '@/components/admin/InlineEditField';
import { InlineEditSelect } from '@/components/admin/InlineEditSelect';
import { PointsCurrencyManager } from '@/components/admin/PointsCurrencyManager';
import { DeleteMemberDialog } from '@/components/admin/DeleteMemberDialog';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase,
  Award,
  Coins,
  Receipt,
  Calendar,
  TrendingUp,
  TrendingDown,
  Image,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface MemberProfile {
  id: string;
  member_id: string | null;
  user_id: string | null;
  nickname: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  line_id: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  member_type: string;
  approval_status: string;
  tier: string;
  total_points: number;
  total_coins: number;
  interests: string[] | null;
  known_products: string[] | null;
  referral_source: string | null;
  avatar_url: string | null;
  created_at: string;
  migrated_at: string | null;
  migration_source: string | null;
}

interface OccupationDetails {
  farm_details?: {
    id: string;
    farm_name: string;
    position: string | null;
    animal_types: string[] | null;
    animal_count: string | null;
    building_count: string | null;
    pest_problems: string[] | null;
    pest_control_methods: string[] | null;
  };
  company_details?: {
    id: string;
    company_name: string;
    business_type: string;
    position: string | null;
    is_elanco: boolean | null;
  };
  vet_details?: {
    id: string;
    organization_name: string;
    vet_type: string;
  };
  shop_details?: {
    id: string;
    shop_name: string;
  };
  government_details?: {
    id: string;
    organization_name: string;
  };
}

interface PointsTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string | null;
  created_at: string;
}

interface CoinsTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string | null;
  created_at: string;
}

interface ReceiptRecord {
  id: string;
  image_url: string;
  amount: number | null;
  status: string;
  points_awarded: number | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const memberTypeLabels: Record<string, string> = {
  farm: 'เจ้าของฟาร์ม',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านขายอาหารสัตว์',
  government: 'หน่วยงานราชการ',
  other: 'อื่นๆ',
};

const tierLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-purple-600',
};

const statusLabels: Record<string, string> = {
  pending: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

const businessTypeLabels: Record<string, string> = {
  animal_production: 'ผลิตสัตว์/ส่งออกหรือแปรรูปเนื้อสัตว์',
  animal_feed: 'ผลิตอาหารสัตว์',
  veterinary_distribution: 'จัดจำหน่ายเวชภัณฑ์สัตว์',
  other: 'อื่นๆ',
};

const vetTypeLabels: Record<string, string> = {
  livestock: 'ปศุสัตว์',
  hospital_clinic: 'โรงพยาบาล/คลินิก',
};

const tierOptions = [
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
];

const statusOptions = [
  { value: 'pending', label: 'รอการอนุมัติ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

export default function AdminMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [occupation, setOccupation] = useState<OccupationDetails>({});
  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [coinsHistory, setCoinsHistory] = useState<CoinsTransaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMemberData(id);
    }
  }, [id]);

  const fetchMemberData = async (profileId: string) => {
    setIsLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const occupationDetails: OccupationDetails = {};
      
      if (profileData.member_type === 'farm') {
        const { data } = await supabase
          .from('farm_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (data) occupationDetails.farm_details = data;
      } else if (profileData.member_type === 'company_employee') {
        const { data } = await supabase
          .from('company_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (data) occupationDetails.company_details = data;
      } else if (profileData.member_type === 'veterinarian') {
        const { data } = await supabase
          .from('vet_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (data) occupationDetails.vet_details = data;
      } else if (profileData.member_type === 'livestock_shop') {
        const { data } = await supabase
          .from('shop_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (data) occupationDetails.shop_details = data;
      } else if (profileData.member_type === 'government') {
        const { data } = await supabase
          .from('government_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();
        if (data) occupationDetails.government_details = data;
      }
      
      setOccupation(occupationDetails);

      const { data: pointsData } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);
      setPointsHistory(pointsData || []);

      const { data: coinsData } = await supabase
        .from('coins_transactions')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50);
      setCoinsHistory(coinsData || []);

      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      setReceipts(receiptsData || []);

    } catch (error) {
      console.error('Error fetching member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfileField = async (field: string, value: string) => {
    if (!profile) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value || null })
      .eq('id', profile.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
      throw error;
    }

    setProfile(prev => prev ? { ...prev, [field]: value || null } : null);
    toast({
      title: "บันทึกสำเร็จ",
      description: "อัปเดตข้อมูลเรียบร้อยแล้ว",
    });
  };

  const updateOccupationField = async (table: 'farm_details' | 'company_details' | 'vet_details' | 'shop_details' | 'government_details', id: string, field: string, value: string) => {
    const { error } = await supabase
      .from(table)
      .update({ [field]: value || null } as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
      throw error;
    }

    // Refresh occupation data
    if (profile) {
      const occupationDetails: OccupationDetails = {};
      if (table === 'farm_details') {
        const { data } = await supabase.from('farm_details').select('*').eq('profile_id', profile.id).maybeSingle();
        if (data) occupationDetails.farm_details = data;
      } else if (table === 'company_details') {
        const { data } = await supabase.from('company_details').select('*').eq('profile_id', profile.id).maybeSingle();
        if (data) occupationDetails.company_details = data;
      } else if (table === 'vet_details') {
        const { data } = await supabase.from('vet_details').select('*').eq('profile_id', profile.id).maybeSingle();
        if (data) occupationDetails.vet_details = data;
      } else if (table === 'shop_details') {
        const { data } = await supabase.from('shop_details').select('*').eq('profile_id', profile.id).maybeSingle();
        if (data) occupationDetails.shop_details = data;
      } else if (table === 'government_details') {
        const { data } = await supabase.from('government_details').select('*').eq('profile_id', profile.id).maybeSingle();
        if (data) occupationDetails.government_details = data;
      }
      setOccupation(prev => ({ ...prev, ...occupationDetails }));
    }

    toast({
      title: "บันทึกสำเร็จ",
      description: "อัปเดตข้อมูลเรียบร้อยแล้ว",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ไม่พบข้อมูลสมาชิก</p>
        <Button variant="outline" onClick={() => navigate('/admin/members')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับไปหน้ารายชื่อสมาชิก
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/members')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                <InlineEditField 
                  value={profile.first_name} 
                  onSave={(v) => updateProfileField('first_name', v)}
                  className="inline-flex"
                />
                {' '}
                <InlineEditField 
                  value={profile.last_name} 
                  onSave={(v) => updateProfileField('last_name', v)}
                  className="inline-flex"
                />
              </h1>
              {profile.nickname && (
                <span className="text-muted-foreground">
                  (<InlineEditField 
                    value={profile.nickname || ''} 
                    onSave={(v) => updateProfileField('nickname', v)}
                    placeholder="ชื่อเล่น"
                    className="inline-flex"
                  />)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {profile.member_id && (
                <Badge variant="outline">{profile.member_id}</Badge>
              )}
              <InlineEditSelect
                value={profile.tier}
                options={tierOptions}
                onSave={(v) => updateProfileField('tier', v)}
                displayValue={tierLabels[profile.tier]}
              />
              <InlineEditSelect
                value={profile.approval_status}
                options={statusOptions}
                onSave={(v) => updateProfileField('approval_status', v)}
                displayValue={statusLabels[profile.approval_status]}
              />
            </div>
          </div>
        </div>
        <DeleteMemberDialog
          profileId={profile.id}
          memberName={`${profile.first_name} ${profile.last_name}`}
          memberId={profile.member_id}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">คะแนนสะสม</p>
                <p className="text-2xl font-bold">{profile.total_points.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Coins className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">เหรียญสะสม</p>
                <p className="text-2xl font-bold">{profile.total_coins.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ใบเสร็จทั้งหมด</p>
                <p className="text-2xl font-bold">{receipts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">วันที่สมัคร</p>
                <p className="text-lg font-medium">
                  {format(new Date(profile.created_at), 'd MMM yyyy', { locale: th })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points & Coins Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">จัดการคะแนนและเหรียญ</CardTitle>
        </CardHeader>
        <CardContent>
          <PointsCurrencyManager
            profileId={profile.id}
            currentPoints={profile.total_points}
            currentCoins={profile.total_coins}
            onUpdate={() => fetchMemberData(profile.id)}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">ข้อมูลส่วนตัว</TabsTrigger>
          <TabsTrigger value="occupation">ข้อมูลอาชีพ</TabsTrigger>
          <TabsTrigger value="transactions">ประวัติคะแนน</TabsTrigger>
          <TabsTrigger value="receipts">ใบเสร็จ</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  ข้อมูลติดต่อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <InlineEditField 
                    value={profile.phone || ''} 
                    onSave={(v) => updateProfileField('phone', v)}
                    placeholder="-"
                    type="tel"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <InlineEditField 
                    value={profile.email || ''} 
                    onSave={(v) => updateProfileField('email', v)}
                    placeholder="-"
                    type="email"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm flex-shrink-0">LINE ID:</span>
                  <InlineEditField 
                    value={profile.line_id || ''} 
                    onSave={(v) => updateProfileField('line_id', v)}
                    placeholder="-"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  ที่อยู่
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ที่อยู่</p>
                  <InlineEditField 
                    value={profile.address || ''} 
                    onSave={(v) => updateProfileField('address', v)}
                    placeholder="-"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ตำบล/แขวง</p>
                    <InlineEditField 
                      value={profile.subdistrict || ''} 
                      onSave={(v) => updateProfileField('subdistrict', v)}
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">อำเภอ/เขต</p>
                    <InlineEditField 
                      value={profile.district || ''} 
                      onSave={(v) => updateProfileField('district', v)}
                      placeholder="-"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">จังหวัด</p>
                    <InlineEditField 
                      value={profile.province || ''} 
                      onSave={(v) => updateProfileField('province', v)}
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">รหัสไปรษณีย์</p>
                    <InlineEditField 
                      value={profile.postal_code || ''} 
                      onSave={(v) => updateProfileField('postal_code', v)}
                      placeholder="-"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle>ความสนใจ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.interests && profile.interests.length > 0 ? (
                    profile.interests.map((interest, idx) => (
                      <Badge key={idx} variant="secondary">{interest}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">ไม่ระบุ</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Known Products */}
            <Card>
              <CardHeader>
                <CardTitle>ผลิตภัณฑ์ที่รู้จัก</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.known_products && profile.known_products.length > 0 ? (
                    profile.known_products.map((product, idx) => (
                      <Badge key={idx} variant="outline">{product}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">ไม่ระบุ</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Migration Info */}
            {profile.migrated_at && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>ข้อมูลการ Migrate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">แหล่งที่มา:</span>
                    <span>{profile.migration_source || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">วันที่ Migrate:</span>
                    <span>{format(new Date(profile.migrated_at), 'd MMM yyyy HH:mm', { locale: th })}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="occupation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                {memberTypeLabels[profile.member_type] || profile.member_type}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {occupation.farm_details && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">ชื่อฟาร์ม</p>
                      <InlineEditField 
                        value={occupation.farm_details.farm_name} 
                        onSave={(v) => updateOccupationField('farm_details', occupation.farm_details!.id, 'farm_name', v)}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ตำแหน่ง</p>
                      <InlineEditField 
                        value={occupation.farm_details.position || ''} 
                        onSave={(v) => updateOccupationField('farm_details', occupation.farm_details!.id, 'position', v)}
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">จำนวนสัตว์</p>
                      <InlineEditField 
                        value={occupation.farm_details.animal_count || ''} 
                        onSave={(v) => updateOccupationField('farm_details', occupation.farm_details!.id, 'animal_count', v)}
                        placeholder="-"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">จำนวนโรงเรือน</p>
                      <InlineEditField 
                        value={occupation.farm_details.building_count || ''} 
                        onSave={(v) => updateOccupationField('farm_details', occupation.farm_details!.id, 'building_count', v)}
                        placeholder="-"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">ชนิดสัตว์</p>
                    <div className="flex flex-wrap gap-2">
                      {occupation.farm_details.animal_types?.map((type, idx) => (
                        <Badge key={idx} variant="secondary">{type}</Badge>
                      )) || <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">ปัญหาแมลงศัตรูพืช</p>
                    <div className="flex flex-wrap gap-2">
                      {occupation.farm_details.pest_problems?.map((prob, idx) => (
                        <Badge key={idx} variant="outline">{prob}</Badge>
                      )) || <span className="text-muted-foreground">-</span>}
                    </div>
                  </div>
                </div>
              )}

              {occupation.company_details && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ชื่อบริษัท</p>
                    <InlineEditField 
                      value={occupation.company_details.company_name} 
                      onSave={(v) => updateOccupationField('company_details', occupation.company_details!.id, 'company_name', v)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ประเภทธุรกิจ</p>
                    <p className="font-medium">{businessTypeLabels[occupation.company_details.business_type] || occupation.company_details.business_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ตำแหน่ง</p>
                    <InlineEditField 
                      value={occupation.company_details.position || ''} 
                      onSave={(v) => updateOccupationField('company_details', occupation.company_details!.id, 'position', v)}
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">พนักงาน Elanco</p>
                    <p className="font-medium">{occupation.company_details.is_elanco ? 'ใช่' : 'ไม่ใช่'}</p>
                  </div>
                </div>
              )}

              {occupation.vet_details && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ชื่อหน่วยงาน</p>
                    <InlineEditField 
                      value={occupation.vet_details.organization_name} 
                      onSave={(v) => updateOccupationField('vet_details', occupation.vet_details!.id, 'organization_name', v)}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ประเภท</p>
                    <p className="font-medium">{vetTypeLabels[occupation.vet_details.vet_type] || occupation.vet_details.vet_type}</p>
                  </div>
                </div>
              )}

              {occupation.shop_details && (
                <div>
                  <p className="text-sm text-muted-foreground">ชื่อร้าน</p>
                  <InlineEditField 
                    value={occupation.shop_details.shop_name} 
                    onSave={(v) => updateOccupationField('shop_details', occupation.shop_details!.id, 'shop_name', v)}
                  />
                </div>
              )}

              {occupation.government_details && (
                <div>
                  <p className="text-sm text-muted-foreground">ชื่อหน่วยงาน</p>
                  <InlineEditField 
                    value={occupation.government_details.organization_name} 
                    onSave={(v) => updateOccupationField('government_details', occupation.government_details!.id, 'organization_name', v)}
                  />
                </div>
              )}

              {!occupation.farm_details && !occupation.company_details && !occupation.vet_details && !occupation.shop_details && !occupation.government_details && (
                <p className="text-muted-foreground">ไม่มีข้อมูลอาชีพ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Points History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  ประวัติคะแนน
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pointsHistory.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pointsHistory.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.transaction_type === 'earn' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{tx.description || tx.source}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.transaction_type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">ไม่มีประวัติ</p>
                )}
              </CardContent>
            </Card>

            {/* Coins History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  ประวัติเหรียญ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coinsHistory.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {coinsHistory.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.transaction_type === 'earn' ? (
                            <TrendingUp className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{tx.description || tx.source}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${tx.transaction_type === 'earn' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">ไม่มีประวัติ</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                ใบเสร็จที่อัพโหลด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-video bg-muted flex items-center justify-center relative">
                        {receipt.image_url ? (
                          <img 
                            src={receipt.image_url} 
                            alt="Receipt" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="w-8 h-8 text-muted-foreground" />
                        )}
                        <Badge 
                          className="absolute top-2 right-2"
                          variant={receipt.status === 'approved' ? 'default' : receipt.status === 'pending' ? 'secondary' : 'destructive'}
                        >
                          {statusLabels[receipt.status]}
                        </Badge>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ยอดเงิน:</span>
                          <span className="font-medium">{receipt.amount?.toLocaleString() || '-'} ฿</span>
                        </div>
                        {receipt.points_awarded && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">คะแนนที่ได้:</span>
                            <span className="font-medium text-green-600">+{receipt.points_awarded}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(receipt.created_at), 'd MMM yyyy HH:mm', { locale: th })}
                        </p>
                        {receipt.admin_notes && (
                          <p className="text-xs text-muted-foreground italic">
                            หมายเหตุ: {receipt.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">ไม่มีใบเสร็จ</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
