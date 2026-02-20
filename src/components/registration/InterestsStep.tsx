import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TermsDialog } from './TermsDialog';

export interface InterestsData {
  interestedInfo: string[];
  knownElancoProducts: string[];
  referralSource: string;
  seminarDate: string;
  elancoStaffName: string;
  referralOther: string;
  acceptTerms: boolean;
}

interface InterestsStepProps {
  data: InterestsData;
  onChange: (data: Partial<InterestsData>) => void;
  memberType?: string;
}

const interestedInfoOptions = [
  'วิธีการควบคุมแมลงวัน',
  'วิธีการควบคุมแมลงปีกแข็ง',
  'วิธีการควบคุมหนู',
  'การป้องกันโรคเข้าสู่ฟาร์ม',
  'ข่าวสารกิจกรรม และโปรโมชั่นต่างๆ',
  'วิธีการใช้ผลิตภัณฑ์และสารเคมี เพื่อควบคุมสัตว์พาหะภายในฟาร์ม',
];

const elancoProductOptions = [
  'Agita', 'Lanirat', 'Neporex', 'Septrivet', 'Elector', 'Virusnip', 'Ektomin', 'ไม่รู้จัก',
];

const referralSourceOptions = [
  { value: 'seminar', label: 'จากงานสัมมนา' },
  { value: 'elanco_staff', label: 'จากพนักงาน Elanco' },
  { value: 'friend', label: 'เพื่อนของท่านชักชวน' },
  { value: 'other', label: 'อื่นๆ' },
];

export function InterestsStep({ data, onChange, memberType }: InterestsStepProps) {
  const hideInfoSections = memberType === 'veterinarian' || memberType === 'government' || memberType === 'other';
  const handleCheckboxChange = (field: 'interestedInfo' | 'knownElancoProducts', value: string, checked: boolean) => {
    const current = data[field] || [];
    if (checked) {
      onChange({ [field]: [...current, value] });
    } else {
      onChange({ [field]: current.filter(v => v !== value) });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">ข้อมูลความสนใจ</h2>
        <p className="text-sm text-muted-foreground mt-1">บอกเราเกี่ยวกับความสนใจของท่าน</p>
      </div>

      {/* ข้อมูลที่คุณสนใจได้รับ - ซ่อนสำหรับสัตวแพทย์/รับราชการ/อื่นๆ */}
      {!hideInfoSections && (
        <div className="space-y-3">
          <Label className="text-base font-medium">ข้อมูลที่คุณสนใจได้รับ <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">(เลือกได้มากกว่า 1 ข้อ)</p>
          <div className="space-y-2">
            {interestedInfoOptions.map((info) => {
              const isChecked = data.interestedInfo?.includes(info);
              return (
                <div
                  key={info}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isChecked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleCheckboxChange('interestedInfo', info, !isChecked)}
                >
                  <Checkbox
                    id={`info-${info}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxChange('interestedInfo', info, !!checked)}
                  />
                  <Label htmlFor={`info-${info}`} className="text-sm cursor-pointer flex-1">
                    {info}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ผลิตภัณฑ์ที่คุณรู้จักของ Elanco - ซ่อนสำหรับสัตวแพทย์/รับราชการ/อื่นๆ */}
      {!hideInfoSections && (
        <div className="space-y-3">
          <Label className="text-base font-medium">ผลิตภัณฑ์ที่คุณรู้จักของ Elanco <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">(เลือกได้มากกว่า 1 ข้อ)</p>
          <div className="grid grid-cols-2 gap-3">
            {elancoProductOptions.map((product) => {
              const isChecked = data.knownElancoProducts?.includes(product);
              return (
                <div
                  key={product}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isChecked ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                  )}
                  onClick={() => handleCheckboxChange('knownElancoProducts', product, !isChecked)}
                >
                  <Checkbox
                    id={`product-${product}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxChange('knownElancoProducts', product, !!checked)}
                  />
                  <Label htmlFor={`product-${product}`} className="text-sm cursor-pointer flex-1">
                    {product}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* คุณรู้จัก Bioprotection connex ได้อย่างไร */}
      <div className="space-y-2">
        <Label className="text-base font-medium">คุณรู้จัก Bioprotection connex ได้อย่างไร</Label>
        <Select
          value={data.referralSource}
          onValueChange={(value) => onChange({ referralSource: value, seminarDate: '', elancoStaffName: '', referralOther: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="กรุณาเลือก" />
          </SelectTrigger>
          <SelectContent>
            {referralSourceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conditional: ระบุวันที่งานสัมมนา */}
      {data.referralSource === 'seminar' && (
        <div className="space-y-2 animate-slide-up">
          <Label>ระบุวันที่งานสัมมนา</Label>
          <Input
            type="date"
            value={data.seminarDate}
            onChange={(e) => onChange({ seminarDate: e.target.value })}
          />
        </div>
      )}

      {/* Conditional: ระบุชื่อพนักงาน Elanco */}
      {data.referralSource === 'elanco_staff' && (
        <div className="space-y-2 animate-slide-up">
          <Label>ระบุชื่อพนักงาน Elanco</Label>
          <Input
            placeholder="ชื่อพนักงาน Elanco"
            value={data.elancoStaffName}
            onChange={(e) => onChange({ elancoStaffName: e.target.value })}
          />
        </div>
      )}

      {/* Conditional: ระบุอื่นๆ */}
      {data.referralSource === 'other' && (
        <div className="space-y-2 animate-slide-up">
          <Label>ระบุแหล่งที่มา</Label>
          <Input
            placeholder="ระบุแหล่งที่มา"
            value={data.referralOther}
            onChange={(e) => onChange({ referralOther: e.target.value })}
          />
        </div>
      )}

      {/* Terms Acceptance */}
      <div className="pt-4 border-t">
        <div
          className={cn(
            "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
            data.acceptTerms ? "border-primary bg-primary/5" : "border-border"
          )}
          onClick={() => onChange({ acceptTerms: !data.acceptTerms })}
        >
          <Checkbox
            id="acceptTerms"
            checked={data.acceptTerms}
            onCheckedChange={(checked) => onChange({ acceptTerms: !!checked })}
            className="mt-0.5"
          />
          <div className="flex-1">
            <Label htmlFor="acceptTerms" className="text-sm cursor-pointer" onClick={(e) => {
              // Prevent label click from triggering checkbox when clicking links
              if ((e.target as HTMLElement).tagName === 'A' || (e.target as HTMLElement).tagName === 'SPAN') {
                e.preventDefault();
              }
            }}>
              ข้าพเจ้ายอมรับ{' '}
              <TermsDialog>
                <span className="text-primary underline cursor-pointer hover:text-primary/80">
                  ข้อกำหนดและเงื่อนไข
                </span>
              </TermsDialog>
              {' '}และ{' '}
              <a
                href="https://privacy.elanco.com/th"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
                onClick={(e) => e.stopPropagation()}
              >
                นโยบายความเป็นส่วนตัว
              </a>
              {' '}ของ Elanco <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              ข้าพเจ้ายินยอมให้ Elanco เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
