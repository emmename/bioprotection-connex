import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StepIndicator } from '@/components/registration/StepIndicator';
import { PersonalInfoStep } from '@/components/registration/PersonalInfoStep';
import { OccupationStep, MemberType, OccupationData } from '@/components/registration/OccupationStep';
import { InterestsStep, InterestsData } from '@/components/registration/InterestsStep';
import { determineApprovalStatus, getNotApprovedMessage } from '@/lib/approval-logic';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, Shield, AlertTriangle, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import bioprotectionLogo from '@/assets/bioprotection-logo_256.png';

interface PersonalInfoData {
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  phone: string;
  lineId: string;
}

const initialPersonalInfo: PersonalInfoData = {
  nickname: '',
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  province: '',
  district: '',
  subdistrict: '',
  postalCode: '',
  phone: '',
  lineId: '',
};

const initialOccupation: OccupationData = {
  memberType: '',
  farmName: '',
  farmPosition: '',
  animalTypes: [],
  animalCount: '',
  buildingCount: '',
  pestProblems: [],
  pestProblemOther: '',
  pestControlMethods: [],
  flyControlMethods: [],
  hasInsecticideSpray: '',
  companyName: '',
  businessType: '',
  businessTypeOther: '',
  companyPosition: '',
  isElanco: false,
  vetOrganization: '',
  vetType: '',
  shopName: '',
  governmentOrganization: '',
  otherOccupation: '',
};

const initialInterests: InterestsData = {
  interestedInfo: [],
  knownElancoProducts: [],
  referralSource: '',
  seminarDate: '',
  elancoStaffName: '',
  referralOther: '',
  acceptTerms: false,
};

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfoData>(initialPersonalInfo);
  const [occupation, setOccupation] = useState<OccupationData>(initialOccupation);
  const [interests, setInterests] = useState<InterestsData>(initialInterests);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{ approved: boolean; memberId?: string }>({ approved: false });

  const { user, profile, isLoading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
    if (!isLoading && profile) {
      // User already has a profile, redirect to dashboard
      navigate('/');
    }
  }, [user, profile, isLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const stepLabels = ['ข้อมูลส่วนตัว', 'ลักษณะงาน', 'ความสนใจ'];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.phone) {
          toast.error('กรุณากรอกชื่อ นามสกุล และเบอร์โทรศัพท์');
          return false;
        }
        return true;
      case 2:
        if (!occupation.memberType) {
          toast.error('กรุณาเลือกประเภทอาชีพ');
          return false;
        }
        // Validate based on member type
        if (occupation.memberType === 'farm' && !occupation.farmName) {
          toast.error('กรุณากรอกชื่อฟาร์ม');
          return false;
        }
        if (occupation.memberType === 'company_employee' && (!occupation.companyName || !occupation.businessType)) {
          toast.error('กรุณากรอกชื่อบริษัทและประเภทธุรกิจ');
          return false;
        }
        if (occupation.memberType === 'veterinarian' && (!occupation.vetOrganization || !occupation.vetType)) {
          toast.error('กรุณากรอกชื่อหน่วยงานและประเภทสัตวแพทย์');
          return false;
        }
        if (occupation.memberType === 'livestock_shop' && !occupation.shopName) {
          toast.error('กรุณากรอกชื่อร้านค้า');
          return false;
        }
        if (occupation.memberType === 'government' && !occupation.governmentOrganization) {
          toast.error('กรุณากรอกชื่อหน่วยงาน');
          return false;
        }
        return true;
      case 3:
        if (!interests.acceptTerms) {
          toast.error('กรุณายอมรับข้อกำหนดและเงื่อนไข');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3) || !user) return;

    setIsSubmitting(true);

    try {
      // Determine approval status
      const approvalStatus = determineApprovalStatus(
        occupation.memberType as MemberType,
        occupation.businessType as string,
        occupation.isElanco,
        occupation.vetType as string
      );

      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          nickname: personalInfo.nickname || null,
          first_name: personalInfo.firstName,
          last_name: personalInfo.lastName,
          email: personalInfo.email || null,
          address: personalInfo.address || null,
          province: personalInfo.province || null,
          district: personalInfo.district || null,
          subdistrict: personalInfo.subdistrict || null,
          postal_code: personalInfo.postalCode || null,
          phone: personalInfo.phone || null,
          line_id: personalInfo.lineId || null,
          member_type: occupation.memberType as MemberType,
          approval_status: approvalStatus,
          interests: interests.interestedInfo.length > 0 ? interests.interestedInfo : null,
          known_products: interests.knownElancoProducts.length > 0 ? interests.knownElancoProducts : null,
          referral_source: interests.referralSource || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Insert occupation-specific details
      if (occupation.memberType === 'farm') {
        await supabase.from('farm_details').insert({
          profile_id: profileData.id,
          farm_name: occupation.farmName,
          position: occupation.farmPosition || null,
          animal_types: occupation.animalTypes.length > 0 ? occupation.animalTypes : null,
          animal_count: occupation.animalCount || null,
          building_count: occupation.buildingCount || null,
          pest_problems: occupation.pestProblems.length > 0 ? occupation.pestProblems : null,
          pest_control_methods: occupation.pestControlMethods.length > 0 ? occupation.pestControlMethods : null,
        });
      } else if (occupation.memberType === 'company_employee') {
        await supabase.from('company_details').insert({
          profile_id: profileData.id,
          company_name: occupation.companyName,
          business_type: occupation.businessType as "animal_production" | "animal_feed" | "veterinary_distribution" | "other",
          position: occupation.companyPosition || null,
          is_elanco: occupation.isElanco,
        });
      } else if (occupation.memberType === 'veterinarian') {
        await supabase.from('vet_details').insert({
          profile_id: profileData.id,
          organization_name: occupation.vetOrganization,
          vet_type: occupation.vetType as "livestock" | "hospital_clinic",
        });
      } else if (occupation.memberType === 'livestock_shop') {
        await supabase.from('shop_details').insert({
          profile_id: profileData.id,
          shop_name: occupation.shopName,
        });
      } else if (occupation.memberType === 'government') {
        await supabase.from('government_details').insert({
          profile_id: profileData.id,
          organization_name: occupation.governmentOrganization,
        });
      }

      setRegistrationResult({
        approved: approvalStatus === 'approved',
        memberId: profileData.member_id || undefined,
      });
      setShowResultDialog(true);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('เกิดข้อผิดพลาดในการลงทะเบียน: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = async () => {
    await refreshProfile();
    setShowResultDialog(false);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-slide-up relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="absolute right-0 top-0 text-muted-foreground hover:text-destructive"
            title="ออกจากระบบ / ยกเลิกการสมัคร"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <img
            src={bioprotectionLogo}
            alt="Bioprotection Connex"
            className="w-20 h-20 mx-auto mb-4 drop-shadow-md rounded-2xl"
          />
          <h1 className="text-2xl font-bold text-foreground">ลงทะเบียนสมาชิก</h1>
          <p className="text-muted-foreground mt-1">Bioprotection Connex</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={3}
          stepLabels={stepLabels}
        />

        {/* Form Card */}
        <Card className="mt-6 border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <PersonalInfoStep
                data={personalInfo}
                onChange={(data) => setPersonalInfo({ ...personalInfo, ...data })}
              />
            )}
            {currentStep === 2 && (
              <OccupationStep
                data={occupation}
                onChange={(data) => setOccupation({ ...occupation, ...data })}
              />
            )}
            {currentStep === 3 && (
              <InterestsStep
                data={interests}
                onChange={(data) => setInterests({ ...interests, ...data })}
                memberType={occupation.memberType}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                ย้อนกลับ
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover"
                >
                  ถัดไป
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hover"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังลงทะเบียน...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      ยืนยันการลงทะเบียน
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {registrationResult.approved ? (
                <>
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <span>ลงทะเบียนสำเร็จ!</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <span>ขอบคุณสำหรับการลงทะเบียน</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-left pt-4">
              {registrationResult.approved ? (
                <div className="space-y-3">
                  <p>ยินดีต้อนรับสู่ Bioprotection Connex!</p>
                  {registrationResult.memberId && (
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">รหัสสมาชิกของคุณ</p>
                      <p className="text-2xl font-bold text-primary">{registrationResult.memberId}</p>
                    </div>
                  )}
                  <p className="text-sm">คุณสามารถเริ่มสะสมแต้มและรับสิทธิพิเศษได้ทันที</p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{getNotApprovedMessage()}</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={handleDialogClose} className="bg-primary">
              {registrationResult.approved ? 'เข้าสู่ระบบ' : 'ตกลง'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
