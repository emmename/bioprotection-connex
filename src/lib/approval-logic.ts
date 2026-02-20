// Auto-approval logic for member registration
export interface ApprovalResult {
  approved: boolean;
  message: string;
}

export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

const NOT_APPROVED_MESSAGE = 'ขอขอบคุณที่คุณให้ความสนใจในการสมัครเข้าร่วมกิจกรรม ระบบสมาชิกขอสงวนสิทธิ์เฉพาะกลุ่มลูกค้าที่เกี่ยวข้องกับสินค้าปศุสัตว์เท่านั้นนะคะ ขออภัยในความไม่สะดวกด้วยค่ะ ทั้งนี้กรณีท่านเป็นกลุ่มสินค้าปศุสัตว์ กรุณาติดต่อ พนักงานขายของบริษัทอีแลนโค เพื่อขอรับรหัสเข้าสมัครสมาชิก';

export function getNotApprovedMessage(): string {
  return NOT_APPROVED_MESSAGE;
}

export function determineApprovalStatus(
  memberType: string,
  businessType?: string,
  isElanco?: boolean,
  vetType?: string
): ApprovalStatus {
  const result = checkAutoApproval(memberType, vetType, businessType, isElanco);
  return result.approved ? 'approved' : 'rejected';
}

export function checkAutoApproval(
  memberType: string,
  vetType?: string,
  businessType?: string,
  isElanco?: boolean
): ApprovalResult {
  // ✅ Approved: Farm
  if (memberType === 'farm') {
    return { approved: true, message: 'อนุมัติอัตโนมัติ: ฟาร์มเลี้ยงสัตว์' };
  }

  // ✅ Approved: Livestock shop
  if (memberType === 'livestock_shop') {
    return { approved: true, message: 'อนุมัติอัตโนมัติ: ร้านค้าสินค้าปศุสัตว์' };
  }

  // Veterinarian logic
  if (memberType === 'veterinarian') {
    // ✅ Approved: Livestock veterinarian
    if (vetType === 'livestock') {
      return { approved: true, message: 'อนุมัติอัตโนมัติ: สัตวแพทย์ประจำปศุสัตว์' };
    }
    // ❌ Not approved: Hospital/clinic veterinarian
    if (vetType === 'hospital_clinic') {
      return { 
        approved: false, 
        message: 'ขอขอบคุณที่คุณให้ความสนใจในการสมัครเข้าร่วมกิจกรรม ระบบสมาชิกขอสงวนสิทธิ์เฉพาะกลุ่มลูกค้าที่เกี่ยวข้องกับสินค้าปศุสัตว์เท่านั้นนะคะ ขออภัยในความไม่สะดวกด้วยค่ะ ทั้งนี้กรณีท่านเป็นกลุ่มสินค้าปศุสัตว์ กรุณาติดต่อ พนักงานขายของบริษัทอีแลนโค เพื่อขอรับรหัสเข้าสมัครสมาชิก'
      };
    }
  }

  // Company employee logic
  if (memberType === 'company_employee') {
    // ✅ Approved: Animal production, animal feed, or other (including Elanco)
    if (businessType === 'animal_production' || businessType === 'animal_feed' || businessType === 'other') {
      return { approved: true, message: 'อนุมัติอัตโนมัติ: พนักงานบริษัท' };
    }
    // Veterinary distribution - check if Elanco
    if (businessType === 'veterinary_distribution') {
      if (isElanco) {
        return { approved: true, message: 'อนุมัติอัตโนมัติ: พนักงาน Elanco' };
      }
      // ❌ Not approved: Non-Elanco veterinary distribution
      return { 
        approved: false, 
        message: 'ขอขอบคุณที่คุณให้ความสนใจในการสมัครเข้าร่วมกิจกรรม ระบบสมาชิกขอสงวนสิทธิ์เฉพาะกลุ่มลูกค้าที่เกี่ยวข้องกับสินค้าปศุสัตว์เท่านั้นนะคะ ขออภัยในความไม่สะดวกด้วยค่ะ ทั้งนี้กรณีท่านเป็นกลุ่มสินค้าปศุสัตว์ กรุณาติดต่อ พนักงานขายของบริษัทอีแลนโค เพื่อขอรับรหัสเข้าสมัครสมาชิก'
      };
    }
  }

  // ❌ Not approved: Government
  if (memberType === 'government') {
    return { 
      approved: false, 
      message: 'ขอขอบคุณที่คุณให้ความสนใจในการสมัครเข้าร่วมกิจกรรม ระบบสมาชิกขอสงวนสิทธิ์เฉพาะกลุ่มลูกค้าที่เกี่ยวข้องกับสินค้าปศุสัตว์เท่านั้นนะคะ ขออภัยในความไม่สะดวกด้วยค่ะ ทั้งนี้กรณีท่านเป็นกลุ่มสินค้าปศุสัตว์ กรุณาติดต่อ พนักงานขายของบริษัทอีแลนโค เพื่อขอรับรหัสเข้าสมัครสมาชิก'
    };
  }

  // ❌ Not approved: Other
  if (memberType === 'other') {
    return { 
      approved: false, 
      message: 'ขอขอบคุณที่คุณให้ความสนใจในการสมัครเข้าร่วมกิจกรรม ระบบสมาชิกขอสงวนสิทธิ์เฉพาะกลุ่มลูกค้าที่เกี่ยวข้องกับสินค้าปศุสัตว์เท่านั้นนะคะ ขออภัยในความไม่สะดวกด้วยค่ะ ทั้งนี้กรณีท่านเป็นกลุ่มสินค้าปศุสัตว์ กรุณาติดต่อ พนักงานขายของบริษัทอีแลนโค เพื่อขอรับรหัสเข้าสมัครสมาชิก'
    };
  }

  // Default: pending (shouldn't reach here)
  return { approved: false, message: 'รอการตรวจสอบจากเจ้าหน้าที่' };
}

export const MEMBER_TYPE_OPTIONS = [
  { value: 'farm', label: 'ฟาร์มเลี้ยงสัตว์' },
  { value: 'company_employee', label: 'พนักงานบริษัท' },
  { value: 'veterinarian', label: 'สัตวแพทย์' },
  { value: 'livestock_shop', label: 'ร้านค้าสินค้าปศุสัตว์' },
  { value: 'government', label: 'รับราชการ' },
  { value: 'other', label: 'อื่นๆ' },
];

export const VET_TYPE_OPTIONS = [
  { value: 'livestock', label: 'สัตวแพทย์ประจำปศุสัตว์' },
  { value: 'hospital_clinic', label: 'สัตวแพทย์ประจำโรงพยาบาลสัตว์/คลินิก' },
];

export const COMPANY_BUSINESS_OPTIONS = [
  { value: 'animal_production', label: 'ผลิตสัตว์' },
  { value: 'animal_feed', label: 'อาหารสัตว์' },
  { value: 'veterinary_distribution', label: 'จัดจำหน่ายเวชภัณฑ์สัตว์' },
  { value: 'other', label: 'อื่นๆ' },
];

export const INTEREST_OPTIONS = [
  'โรคในสุกร',
  'โรคในสัตว์ปีก',
  'โรคในโค-กระบือ',
  'การจัดการฟาร์ม',
  'โภชนาการสัตว์',
  'การควบคุมสัตว์พาหะนำโรค',
  'ความปลอดภัยทางชีวภาพ',
  'เทคโนโลยีฟาร์มอัจฉริยะ',
];

export const ELANCO_PRODUCTS = [
  'Larvadex',
  'Neporex',
  'Starbar',
  'Maxforce',
  'Quickstrike',
  'CyLence',
  'Cylap',
  'Exzolt',
];

export const REFERRAL_SOURCES = [
  'พนักงานขาย Elanco',
  'งานสัมมนา/นิทรรศการ',
  'Facebook',
  'LINE',
  'เพื่อน/คนรู้จัก',
  'เว็บไซต์',
  'อื่นๆ',
];

export const ANIMAL_TYPES = [
  'สุกร',
  'ไก่เนื้อ',
  'ไก่ไข่',
  'เป็ด',
  'โคเนื้อ',
  'โคนม',
  'กระบือ',
  'แพะ/แกะ',
  'อื่นๆ',
];

export const PEST_PROBLEMS = [
  'แมลงวัน',
  'ยุง',
  'เห็บ',
  'เหา',
  'ไร',
  'มด',
  'แมลงสาบ',
  'หนู',
];

export const PEST_CONTROL_METHODS = [
  'สารเคมี',
  'กับดัก',
  'ตาข่าย',
  'สมุนไพร',
  'ไม่ได้ใช้วิธีใด',
];

export const FARM_POSITIONS = [
  'เจ้าของฟาร์ม',
  'ผู้จัดการฟาร์ม',
  'สัตวบาล',
  'พนักงาน',
  'อื่นๆ',
];
