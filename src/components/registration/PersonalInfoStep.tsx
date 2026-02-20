import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getProvinces,
  getDistrictsByProvince,
  getSubdistrictsByDistrict,
  getPostalCodeBySubdistrict
} from '@/lib/thai-address-data';

interface PersonalInfoData {
  nickname: string;
  firstName: string;
  lastName: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  phone: string;
  lineId: string;
}

interface PersonalInfoStepProps {
  data: PersonalInfoData;
  onChange: (data: Partial<PersonalInfoData>) => void;
}

export function PersonalInfoStep({ data, onChange }: PersonalInfoStepProps) {
  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistrictsByProvince(data.province), [data.province]);
  const subdistricts = useMemo(() => getSubdistrictsByDistrict(data.province, data.district), [data.province, data.district]);

  const handleProvinceChange = (value: string) => {
    onChange({
      province: value,
      district: '',
      subdistrict: '',
      postalCode: ''
    });
  };

  const handleDistrictChange = (value: string) => {
    onChange({
      district: value,
      subdistrict: '',
      postalCode: ''
    });
  };

  const handleSubdistrictChange = (value: string) => {
    const postalCode = getPostalCodeBySubdistrict(data.province, data.district, value);
    onChange({
      subdistrict: value,
      postalCode
    });
  };
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">ข้อมูลส่วนตัว</h2>
        <p className="text-sm text-muted-foreground mt-1">กรุณากรอกข้อมูลของท่านให้ครบถ้วน</p>
      </div>

      <div className="grid gap-4">
        {/* Nickname */}
        <div className="space-y-2">
          <Label htmlFor="nickname">ชื่อเล่น</Label>
          <Input
            id="nickname"
            placeholder="ชื่อเล่น"
            value={data.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
          />
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">ชื่อจริง <span className="text-destructive">*</span></Label>
            <Input
              id="firstName"
              placeholder="ชื่อจริง"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">นามสกุล <span className="text-destructive">*</span></Label>
            <Input
              id="lastName"
              placeholder="นามสกุล"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              required
            />
          </div>
        </div>


        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address">ที่อยู่ (บ้านเลขที่, ซอย, ถนน)</Label>
          <Input
            id="address"
            placeholder="บ้านเลขที่, ซอย, ถนน"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </div>

        {/* Province */}
        <div className="space-y-2">
          <Label htmlFor="province">จังหวัด</Label>
          <Select value={data.province} onValueChange={handleProvinceChange}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกจังหวัด" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* District */}
        <div className="space-y-2">
          <Label htmlFor="district">อำเภอ/เขต</Label>
          <Select
            value={data.district}
            onValueChange={handleDistrictChange}
            disabled={!data.province}
          >
            <SelectTrigger>
              <SelectValue placeholder={data.province ? "เลือกอำเภอ/เขต" : "กรุณาเลือกจังหวัดก่อน"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {districts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subdistrict */}
        <div className="space-y-2">
          <Label htmlFor="subdistrict">ตำบล/แขวง</Label>
          <Select
            value={data.subdistrict}
            onValueChange={handleSubdistrictChange}
            disabled={!data.district}
          >
            <SelectTrigger>
              <SelectValue placeholder={data.district ? "เลือกตำบล/แขวง" : "กรุณาเลือกอำเภอ/เขตก่อน"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {subdistricts.map((subdistrict) => (
                <SelectItem key={subdistrict.name} value={subdistrict.name}>
                  {subdistrict.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Postal Code */}
        <div className="space-y-2">
          <Label htmlFor="postalCode">รหัสไปรษณีย์</Label>
          <Select
            value={data.postalCode}
            onValueChange={(value) => onChange({ postalCode: value })}
            disabled={!data.subdistrict}
          >
            <SelectTrigger>
              <SelectValue placeholder={data.subdistrict ? "เลือกรหัสไปรษณีย์" : "กรุณาเลือกตำบล/แขวงก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {data.postalCode && (
                <SelectItem value={data.postalCode}>
                  {data.postalCode}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์ <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              placeholder="0812345678"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lineId">Line ID</Label>
            <Input
              id="lineId"
              placeholder="Line ID"
              value={data.lineId}
              onChange={(e) => onChange({ lineId: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
