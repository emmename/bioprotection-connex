import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Stethoscope, Store, Building, Users, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MemberType = 'farm' | 'company_employee' | 'veterinarian' | 'livestock_shop' | 'government' | 'other';

export interface OccupationData {
  memberType: MemberType | '';
  // Farm fields
  farmName: string;
  farmPosition: string;
  animalTypes: string[];
  animalCount: string;
  buildingCount: string;
  pestProblems: string[];
  pestProblemOther: string;
  pestControlMethods: string[];
  flyControlMethods: string[];
  hasInsecticideSpray: string;
  // Company fields
  companyName: string;
  businessType: string;
  businessTypeOther: string;
  companyPosition: string;
  isElanco: boolean;
  // Vet fields
  vetOrganization: string;
  vetType: string;
  // Shop fields
  shopName: string;
  // Government fields
  governmentOrganization: string;
  // Other fields
  otherOccupation: string;
}

interface OccupationStepProps {
  data: OccupationData;
  onChange: (data: Partial<OccupationData>) => void;
}

const memberTypeOptions = [
  { value: 'farm', label: 'ฟาร์มเลี้ยงสัตว์', icon: Building2 },
  { value: 'company_employee', label: 'พนักงานบริษัท', icon: Building },
  { value: 'veterinarian', label: 'สัตวแพทย์', icon: Stethoscope },
  { value: 'livestock_shop', label: 'ร้านค้าสินค้าปศุสัตว์', icon: Store },
  { value: 'government', label: 'รับราชการ', icon: Users },
  { value: 'other', label: 'อื่นๆ', icon: HelpCircle },
];

const animalTypeOptions = ['ไก่พันธุ์', 'ไก่เนื้อ', 'ไก่ไข่', 'สุกร', 'วัว', 'สัตว์อื่นๆ'];
const farmPositionOptions = [
  { value: 'owner', label: 'เจ้าของกิจการ' },
  { value: 'farm_manager', label: 'ผู้จัดการฟาร์ม' },
  { value: 'animal_husbandry', label: 'สัตวบาล' },
  { value: 'admin', label: 'ธุรการ' },
  { value: 'other', label: 'อื่นๆ' },
];
const pestProblemOptions = ['แมลงวัน', 'แมลงปีกแข็ง', 'หนู', 'อื่นๆ'];
const flyControlOptions = [
  'ใช้สารเคมีควบคุมตัวเต็มวัย',
  'ใช้สารเคมีควบคุมตัวหนอนแมลงวัน',
  'ใช้กระดาษกาว',
  'ใช้วิธีการจัดการสิ่งแวดล้อม',
];
const hasInsecticideOptions = [
  { value: 'yes', label: 'มี' },
  { value: 'no', label: 'ไม่มี' },
];
const businessTypeOptions = [
  { value: 'animal_production', label: 'ผลิตสัตว์/ส่งออกหรือแปรรูปเนื้อสัตว์' },
  { value: 'animal_feed', label: 'ผลิตอาหารสัตว์' },
  { value: 'veterinary_distribution', label: 'จัดจำหน่ายเวชภัณฑ์สัตว์' },
  { value: 'other', label: 'อื่นๆ' },
];

export function OccupationStep({ data, onChange }: OccupationStepProps) {
  const handleCheckboxChange = (
    field: 'animalTypes' | 'pestProblems' | 'pestControlMethods' | 'flyControlMethods',
    value: string,
    checked: boolean
  ) => {
    const current = (data[field] as string[]) || [];
    if (checked) {
      onChange({ [field]: [...current, value] });
    } else {
      onChange({ [field]: current.filter(v => v !== value) });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">ลักษณะงาน</h2>
        <p className="text-sm text-muted-foreground mt-1">เลือกประเภทอาชีพของท่าน</p>
      </div>

      {/* Member Type Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {memberTypeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = data.memberType === option.value;
          
          return (
            <Card
              key={option.value}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary bg-primary/5"
              )}
              onClick={() => onChange({ memberType: option.value as MemberType })}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dynamic Form based on Member Type */}
      <div className="mt-6 space-y-4">
        {/* Farm Form */}
        {data.memberType === 'farm' && (
          <div className="space-y-4 animate-slide-up">
            {/* ชื่อฟาร์ม */}
            <div className="space-y-2">
              <Label>ชื่อฟาร์ม <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ชื่อฟาร์ม"
                value={data.farmName}
                onChange={(e) => onChange({ farmName: e.target.value })}
              />
            </div>

            {/* ฟาร์มของท่านเลี้ยงสัตว์ชนิดใด */}
            <div className="space-y-2">
              <Label>ฟาร์มของท่านเลี้ยงสัตว์ชนิดใด <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">(เลือกได้มากกว่าหนึ่งคำตอบ)</p>
              <div className="grid grid-cols-2 gap-2">
                {animalTypeOptions.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`animal-${type}`}
                      checked={data.animalTypes?.includes(type)}
                      onCheckedChange={(checked) => handleCheckboxChange('animalTypes', type, !!checked)}
                    />
                    <Label htmlFor={`animal-${type}`} className="text-sm">{type}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* ตำแหน่งของท่านในฟาร์ม */}
            <div className="space-y-2">
              <Label>ตำแหน่งของท่านในฟาร์ม</Label>
              <Select value={data.farmPosition} onValueChange={(value) => onChange({ farmPosition: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  {farmPositionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* จำนวนสัตว์ และ จำนวนโรงเรือน */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>จำนวนสัตว์ภายในฟาร์ม (ตัว)</Label>
                <Input
                  placeholder="จำนวนสัตว์"
                  value={data.animalCount}
                  onChange={(e) => onChange({ animalCount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>จำนวนโรงเรือนภายในฟาร์ม (โรงเรือน)</Label>
                <Input
                  placeholder="จำนวนโรงเรือน"
                  value={data.buildingCount}
                  onChange={(e) => onChange({ buildingCount: e.target.value })}
                />
              </div>
            </div>

            {/* ปัญหาสัตว์พาหะในฟาร์ม */}
            <div className="space-y-2">
              <Label>ในฟาร์มของท่านพบปัญหาสัตว์พาหะใดมากที่สุด</Label>
              <p className="text-xs text-muted-foreground">(เลือกได้มากกว่า 1 ชนิด)</p>
              <div className="grid grid-cols-2 gap-2">
                {pestProblemOptions.map((pest) => (
                  <div key={pest} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pest-${pest}`}
                      checked={data.pestProblems?.includes(pest)}
                      onCheckedChange={(checked) => handleCheckboxChange('pestProblems', pest, !!checked)}
                    />
                    <Label htmlFor={`pest-${pest}`} className="text-sm">{pest}</Label>
                  </div>
                ))}
              </div>
              {data.pestProblems?.includes('อื่นๆ') && (
                <div className="mt-2 animate-slide-up">
                  <Input
                    placeholder="ระบุสัตว์พาหะอื่นๆ"
                    value={data.pestProblemOther || ''}
                    onChange={(e) => onChange({ pestProblemOther: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* วิธีควบคุมและกำจัดแมลงวัน */}
            <div className="space-y-2">
              <Label>ท่านมีการควบคุม และกำจัดแมลงวันด้วยวิธีใดบ้าง</Label>
              <p className="text-xs text-muted-foreground">(เลือกได้มากกว่า 1 ชนิด)</p>
              <div className="space-y-2">
                {flyControlOptions.map((method) => (
                  <div key={method} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fly-${method}`}
                      checked={data.flyControlMethods?.includes(method)}
                      onCheckedChange={(checked) => handleCheckboxChange('flyControlMethods', method, !!checked)}
                    />
                    <Label htmlFor={`fly-${method}`} className="text-sm">{method}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* พ่นสารฆ่าแมลงก่อนลงไก่ */}
            <div className="space-y-2">
              <Label>ท่านมีการพ่นสารฆ่าแมลง เพื่อควบคุมแมลงปีกแข็งบนแกลบ ก่อนลงไก่หรือไม่ <span className="text-destructive">*</span></Label>
              <Select value={data.hasInsecticideSpray} onValueChange={(value) => onChange({ hasInsecticideSpray: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="ระบุ" />
                </SelectTrigger>
                <SelectContent>
                  {hasInsecticideOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Company Form */}
        {data.memberType === 'company_employee' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label>ชื่อบริษัท <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ชื่อบริษัท"
                value={data.companyName}
                onChange={(e) => onChange({ companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภทธุรกิจ <span className="text-destructive">*</span></Label>
              <Select value={data.businessType} onValueChange={(value) => onChange({ businessType: value, businessTypeOther: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทธุรกิจ" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.businessType === 'other' && (
              <div className="space-y-2 animate-slide-up">
                <Label>ระบุประเภทธุรกิจ <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="ระบุประเภทธุรกิจ"
                  value={data.businessTypeOther || ''}
                  onChange={(e) => onChange({ businessTypeOther: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>ตำแหน่งงาน</Label>
              <Input
                placeholder="ตำแหน่ง"
                value={data.companyPosition}
                onChange={(e) => onChange({ companyPosition: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isElanco"
                checked={data.isElanco}
                onCheckedChange={(checked) => onChange({ isElanco: !!checked })}
              />
              <Label htmlFor="isElanco">ฉันเป็นพนักงานอีแลนโค (Elanco)</Label>
            </div>
          </div>
        )}

        {/* Veterinarian Form */}
        {data.memberType === 'veterinarian' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label>ชื่อหน่วยงาน <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ชื่อหน่วยงาน"
                value={data.vetOrganization}
                onChange={(e) => onChange({ vetOrganization: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภทสัตวแพทย์ <span className="text-destructive">*</span></Label>
              <RadioGroup value={data.vetType} onValueChange={(value) => onChange({ vetType: value })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="livestock" id="vet-livestock" />
                  <Label htmlFor="vet-livestock">สัตวแพทย์ประจำปศุสัตว์</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hospital_clinic" id="vet-clinic" />
                  <Label htmlFor="vet-clinic">สัตวแพทย์ประจำโรงพยาบาลสัตว์/คลินิก</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Shop Form */}
        {data.memberType === 'livestock_shop' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label>ชื่อร้านค้า <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ชื่อร้านค้า"
                value={data.shopName}
                onChange={(e) => onChange({ shopName: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Government Form */}
        {data.memberType === 'government' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label>ชื่อหน่วยงาน <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ชื่อหน่วยงาน"
                value={data.governmentOrganization}
                onChange={(e) => onChange({ governmentOrganization: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Other Form */}
        {data.memberType === 'other' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label>ระบุลักษณะงาน <span className="text-destructive">*</span></Label>
              <Input
                placeholder="ระบุลักษณะงานของท่าน"
                value={data.otherOccupation || ''}
                onChange={(e) => onChange({ otherOccupation: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
