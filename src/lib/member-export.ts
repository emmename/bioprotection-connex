import { supabase } from '@/integrations/supabase/client';
import { type MemberImportData, exportMembersToCSV } from './csv-utils';

interface ProfileWithDetails {
  id: string;
  member_id: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  nickname: string | null;
  line_id: string | null;
  line_user_id: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  member_type: string;
  tier: string;
  total_points: number;
  total_coins: number;
  interests: string[] | null;
  known_products: string[] | null;
  referral_source: string | null;
  created_at: string;
  farm_details: {
    farm_name: string;
    position: string | null;
    animal_types: string[] | null;
    animal_count: string | null;
    building_count: string | null;
    pest_problems: string[] | null;
    pest_control_methods: string[] | null;
  } | null;
  company_details: {
    company_name: string;
    business_type: string;
    position: string | null;
    is_elanco: boolean | null;
  } | null;
  vet_details: {
    organization_name: string;
    vet_type: string;
  } | null;
  shop_details: {
    shop_name: string;
  } | null;
  government_details: {
    organization_name: string;
  } | null;
}

/**
 * Fetch all member data including occupation details for export
 */
export async function fetchMembersForExport(): Promise<MemberImportData[]> {
  // Fetch profiles with all related occupation details
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      member_id,
      phone,
      first_name,
      last_name,
      email,
      nickname,
      line_id,
      line_user_id,
      address,
      province,
      district,
      subdistrict,
      postal_code,
      member_type,
      tier,
      total_points,
      total_coins,
      interests,
      known_products,
      referral_source,
      created_at,
      farm_details (
        farm_name,
        position,
        animal_types,
        animal_count,
        building_count,
        pest_problems,
        pest_control_methods
      ),
      company_details (
        company_name,
        business_type,
        position,
        is_elanco
      ),
      vet_details (
        organization_name,
        vet_type
      ),
      shop_details (
        shop_name
      ),
      government_details (
        organization_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Map to MemberImportData format
  return (profiles as unknown as ProfileWithDetails[]).map(profile => {
    const exportData: MemberImportData = {
      member_id: profile.member_id || undefined,
      phone: profile.phone || '',
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email || undefined,
      nickname: profile.nickname || undefined,
      line_id: profile.line_id || undefined,
      line_user_id: profile.line_user_id || undefined,
      address: profile.address || undefined,
      province: profile.province || undefined,
      district: profile.district || undefined,
      subdistrict: profile.subdistrict || undefined,
      postal_code: profile.postal_code || undefined,
      member_type: profile.member_type as MemberImportData['member_type'],
      tier: profile.tier as MemberImportData['tier'],
      total_points: profile.total_points,
      total_coins: profile.total_coins,
      interests: profile.interests || undefined,
      known_products: profile.known_products || undefined,
      referral_source: profile.referral_source || undefined,
      created_at: profile.created_at,
    };

    // Add farm details if available
    if (profile.farm_details) {
      exportData.farm_name = profile.farm_details.farm_name;
      exportData.farm_position = profile.farm_details.position || undefined;
      exportData.animal_types = profile.farm_details.animal_types || undefined;
      exportData.animal_count = profile.farm_details.animal_count || undefined;
      exportData.building_count = profile.farm_details.building_count || undefined;
      exportData.pest_problems = profile.farm_details.pest_problems || undefined;
      exportData.pest_control_methods = profile.farm_details.pest_control_methods || undefined;
    }

    // Add company details if available
    if (profile.company_details) {
      exportData.company_name = profile.company_details.company_name;
      exportData.business_type = profile.company_details.business_type;
      exportData.company_position = profile.company_details.position || undefined;
      exportData.is_elanco = profile.company_details.is_elanco || undefined;
    }

    // Add vet details if available
    if (profile.vet_details) {
      exportData.vet_organization = profile.vet_details.organization_name;
      exportData.vet_type = profile.vet_details.vet_type;
    }

    // Add shop details if available
    if (profile.shop_details) {
      exportData.shop_name = profile.shop_details.shop_name;
    }

    // Add government details if available
    if (profile.government_details) {
      exportData.government_organization = profile.government_details.organization_name;
    }

    return exportData;
  });
}

/**
 * Export all members to CSV with complete data
 */
export async function exportAllMembersToCSV(): Promise<string> {
  const members = await fetchMembersForExport();
  return exportMembersToCSV(members);
}

/**
 * Download members as CSV file
 */
export async function downloadMembersCSV(): Promise<void> {
  const csv = await exportAllMembersToCSV();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
