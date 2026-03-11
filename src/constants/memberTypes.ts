import type { Database } from '@/integrations/supabase/types';

// ─── Types ───
export type MemberType = Database['public']['Enums']['member_type'];
export type TierLevel = Database['public']['Enums']['tier_level'];

export interface MemberTypeOption {
  value: MemberType;
  label: string;
}

export interface SubTypeOption {
  value: string;
  label: string;
}

// ─── Member Type Options ───
// Used across admin pages for filtering and targeting
export const MEMBER_TYPE_OPTIONS: MemberTypeOption[] = [
  { value: 'farm', label: 'ฟาร์มเลี้ยงสัตว์' },
  { value: 'company_employee', label: 'พนักงานบริษัท' },
  { value: 'veterinarian', label: 'สัตวแพทย์' },
  { value: 'livestock_shop', label: 'ร้านค้าสินค้าปศุสัตว์' },
];

// ─── Member Sub-Types ───
// Sub-types matching registration system (OccupationStep.tsx)
export const MEMBER_SUB_TYPES: Record<string, SubTypeOption[]> = {
  farm: [
    { value: 'owner', label: 'เจ้าของกิจการ' },
    { value: 'farm_manager', label: 'ผู้จัดการฟาร์ม' },
    { value: 'animal_husbandry', label: 'สัตวบาล' },
    { value: 'admin', label: 'ธุรการ' },
    { value: 'other', label: 'อื่นๆ' },
  ],
  company_employee: [
    { value: 'animal_production', label: 'ผลิตสัตว์/ส่งออกหรือแปรรูปเนื้อสัตว์' },
    { value: 'animal_feed', label: 'ผลิตอาหารสัตว์' },
    { value: 'veterinary_distribution', label: 'จัดจำหน่ายเวชภัณฑ์สัตว์' },
    { value: 'elanco', label: 'พนักงานอีแลนโค (Elanco)' },
    { value: 'other', label: 'อื่นๆ' },
  ],
  veterinarian: [
    { value: 'livestock', label: 'สัตวแพทย์ประจำปศุสัตว์' },
  ],
};

// ─── Member Type Labels ───
// Used in dashboard for display purposes (includes extra types like government/other)
export const MEMBER_TYPE_LABELS: Record<string, string> = {
  farm: 'ฟาร์ม (ลูกค้า)',
  company_employee: 'พนักงานบริษัท',
  veterinarian: 'สัตวแพทย์',
  livestock_shop: 'ร้านขายยาสัตว์',
  government: 'หน่วยงานรัฐ',
  other: 'อื่นๆ',
  unspecified: 'ไม่ระบุ',
};

// ─── Tier Configuration ───
export const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  platinum: { label: 'Platinum', color: 'text-violet-700', bg: 'bg-violet-100' },
  gold: { label: 'Gold', color: 'text-amber-700', bg: 'bg-amber-100' },
  silver: { label: 'Silver', color: 'text-slate-600', bg: 'bg-slate-200' },
  bronze: { label: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-100' },
  unassigned: { label: 'ยังไม่มีระดับ', color: 'text-slate-500', bg: 'bg-slate-100' },
};

// ─── Fallback Tier Options ───
export const FALLBACK_TIER_OPTIONS: { label: string; value: TierLevel }[] = [
  { label: 'บรอนซ์', value: 'bronze' },
  { label: 'ซิลเวอร์', value: 'silver' },
  { label: 'โกลด์', value: 'gold' },
  { label: 'แพลตตินัม', value: 'platinum' },
];
