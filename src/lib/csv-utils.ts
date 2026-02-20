export interface MemberImportData {
  // Profile fields (23 columns - added member_id, email, and created_at)
  member_id?: string;
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
  nickname?: string;
  line_id?: string;
  line_user_id?: string;
  address?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postal_code?: string;
  member_type: 'farm' | 'company_employee' | 'veterinarian' | 'livestock_shop' | 'government' | 'other';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_points?: number;
  total_coins?: number;
  interests?: string[];
  known_products?: string[];
  referral_source?: string;
  created_at?: string;
  
  // Farm details (7 columns)
  farm_name?: string;
  farm_position?: string;
  animal_types?: string[];
  animal_count?: string;
  building_count?: string;
  pest_problems?: string[];
  pest_control_methods?: string[];
  
  // Company details (4 columns)
  company_name?: string;
  business_type?: string;
  company_position?: string;
  is_elanco?: boolean;
  
  // Vet details (2 columns)
  vet_organization?: string;
  vet_type?: string;
  
  // Shop details (1 column)
  shop_name?: string;
  
  // Government details (1 column)
  government_organization?: string;
}

// Array fields that use pipe separator
const ARRAY_FIELDS = [
  'interests',
  'known_products',
  'animal_types',
  'pest_problems',
  'pest_control_methods'
];

// Numeric fields
const NUMBER_FIELDS = ['total_points', 'total_coins'];

// Boolean fields
const BOOLEAN_FIELDS = ['is_elanco'];

/**
 * Parse a CSV line handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Don't forget the last value
  result.push(current.trim());
  
  return result;
}

/**
 * Parse CSV text into array of MemberImportData
 */
export function parseCSV(csvText: string): MemberImportData[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV ต้องมีอย่างน้อย 2 บรรทัด (header และ data)');
  }
  
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Validate required headers
  const requiredHeaders = ['phone', 'first_name', 'last_name', 'member_type'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    throw new Error(`ขาด column ที่จำเป็น: ${missingHeaders.join(', ')}`);
  }
  
  const members: MemberImportData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const member: Record<string, unknown> = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (!value) return;
      
      // Handle array fields (separated by |)
      if (ARRAY_FIELDS.includes(header)) {
        member[header] = value.split('|').map(v => v.trim()).filter(v => v);
      }
      // Handle boolean fields
      else if (BOOLEAN_FIELDS.includes(header)) {
        member[header] = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
      }
      // Handle numeric fields
      else if (NUMBER_FIELDS.includes(header)) {
        const num = parseInt(value, 10);
        member[header] = isNaN(num) ? 0 : num;
      }
      // Handle string fields
      else {
        member[header] = value;
      }
    });
    
    // Only add if has required phone
    if (member.phone) {
      members.push(member as unknown as MemberImportData);
    }
  }
  
  return members;
}

/**
 * Generate CSV template with all columns (now 40 with member_id and email)
 */
export function generateCSVTemplate(): string {
  const headers = [
    // Profile fields
    'member_id',
    'phone',
    'first_name',
    'last_name',
    'email',
    'nickname',
    'line_id',
    'line_user_id',
    'address',
    'province',
    'district',
    'subdistrict',
    'postal_code',
    'member_type',
    'tier',
    'total_points',
    'total_coins',
    'interests',
    'known_products',
    'referral_source',
    // Farm details
    'farm_name',
    'farm_position',
    'animal_types',
    'animal_count',
    'building_count',
    'pest_problems',
    'pest_control_methods',
    // Company details
    'company_name',
    'business_type',
    'company_position',
    'is_elanco',
    // Vet details
    'vet_organization',
    'vet_type',
    // Shop details
    'shop_name',
    // Government details
    'government_organization'
  ];
  
  const exampleRow = [
    'MB-0001',
    '0812345678',
    'สมชาย',
    'ใจดี',
    'somchai@example.com',
    'ต้อม',
    'somchai_line',
    'U1234567890abcdef',
    '123 หมู่ 1',
    'กรุงเทพมหานคร',
    'บางกะปิ',
    'คลองจั่น',
    '10240',
    'farm',
    'bronze',
    '500',
    '50',
    'สุขภาพสัตว์|การเลี้ยง',
    'Product A|Product B',
    'งานสัมมนา',
    'ฟาร์มสมชาย',
    'เจ้าของ',
    'ไก่เนื้อ|ไก่ไข่',
    '5000',
    '10',
    'แมลงวัน|ด้วง',
    'สารเคมี|กับดัก',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
  
  return headers.join(',') + '\n' + exampleRow.join(',');
}

/**
 * Export members to CSV format
 */
export function exportMembersToCSV(members: MemberImportData[]): string {
  const headers = [
    'member_id',
    'phone',
    'first_name',
    'last_name',
    'email',
    'nickname',
    'line_id',
    'line_user_id',
    'address',
    'province',
    'district',
    'subdistrict',
    'postal_code',
    'member_type',
    'tier',
    'total_points',
    'total_coins',
    'interests',
    'known_products',
    'referral_source',
    'created_at',
    'farm_name',
    'farm_position',
    'animal_types',
    'animal_count',
    'building_count',
    'pest_problems',
    'pest_control_methods',
    'company_name',
    'business_type',
    'company_position',
    'is_elanco',
    'vet_organization',
    'vet_type',
    'shop_name',
    'government_organization'
  ];
  
  const rows = members.map(member => {
    return headers.map(header => {
      const value = member[header as keyof MemberImportData];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      // Handle arrays - join with pipe
      if (Array.isArray(value)) {
        return value.join('|');
      }
      
      // Handle booleans
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      
      // Handle strings with commas or quotes - wrap in quotes
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      
      return strValue;
    }).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Validate member data before import
 */
export function validateMemberData(member: MemberImportData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!member.phone) {
    errors.push('phone is required');
  } else if (!/^[0-9]{9,10}$/.test(member.phone.replace(/[^0-9]/g, ''))) {
    errors.push('phone must be 9-10 digits');
  }
  
  if (!member.first_name) {
    errors.push('first_name is required');
  }
  
  if (!member.last_name) {
    errors.push('last_name is required');
  }
  
  if (!member.member_type) {
    errors.push('member_type is required');
  } else {
    const validTypes = ['farm', 'company_employee', 'veterinarian', 'livestock_shop', 'government', 'other'];
    if (!validTypes.includes(member.member_type)) {
      errors.push(`member_type must be one of: ${validTypes.join(', ')}`);
    }
  }
  
  // Validate tier if provided
  if (member.tier) {
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validTiers.includes(member.tier)) {
      errors.push(`tier must be one of: ${validTiers.join(', ')}`);
    }
  }
  
  // Validate occupation-specific required fields
  if (member.member_type === 'farm' && !member.farm_name) {
    // Farm name is optional but recommended
  }
  
  if (member.member_type === 'company_employee' && member.business_type) {
    const validBusinessTypes = ['feed', 'farm_equipment', 'veterinary_distributor', 'animal_health', 'other'];
    if (!validBusinessTypes.includes(member.business_type)) {
      errors.push(`business_type must be one of: ${validBusinessTypes.join(', ')}`);
    }
  }
  
  if (member.member_type === 'veterinarian' && member.vet_type) {
    const validVetTypes = ['private_clinic', 'government', 'company', 'freelance'];
    if (!validVetTypes.includes(member.vet_type)) {
      errors.push(`vet_type must be one of: ${validVetTypes.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
