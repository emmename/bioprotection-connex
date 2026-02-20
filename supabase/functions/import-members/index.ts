import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemberData {
  // Profile fields
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
  
  // Farm details
  farm_name?: string;
  farm_position?: string;
  animal_types?: string[];
  animal_count?: string;
  building_count?: string;
  pest_problems?: string[];
  pest_control_methods?: string[];
  
  // Company details
  company_name?: string;
  business_type?: string;
  company_position?: string;
  is_elanco?: boolean;
  
  // Vet details
  vet_organization?: string;
  vet_type?: string;
  
  // Shop details
  shop_name?: string;
  
  // Government details
  government_organization?: string;
}

interface ImportResults {
  success: string[];
  failed: { phone: string; error: string }[];
  skipped: { phone: string; reason: string }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[import-members] Starting import request');
    
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[import-members] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user token to verify admin role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user and verify admin role
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log('[import-members] Invalid user:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role using service client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log('[import-members] User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[import-members] Admin verified:', user.id);

    // Parse request body
    const { members } = await req.json() as { members: MemberData[] };
    
    if (!members || !Array.isArray(members)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: members array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[import-members] Processing', members.length, 'members');

    const results: ImportResults = {
      success: [],
      failed: [],
      skipped: []
    };

    // Process each member
    for (const member of members) {
      try {
        // Validate required fields
        if (!member.phone || !member.first_name || !member.last_name || !member.member_type) {
          results.failed.push({
            phone: member.phone || 'unknown',
            error: 'ข้อมูลไม่ครบ: ต้องมี phone, first_name, last_name, member_type'
          });
          continue;
        }

        // Normalize phone number
        const normalizedPhone = member.phone.replace(/[^0-9]/g, '');
        
        // Check if phone already exists
        const { data: existingByPhone } = await adminClient
          .from('profiles')
          .select('id, phone')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        if (existingByPhone) {
          results.skipped.push({
            phone: normalizedPhone,
            reason: 'เบอร์โทรนี้มีอยู่ในระบบแล้ว'
          });
          continue;
        }

        // Check if line_user_id already exists (if provided)
        if (member.line_user_id) {
          const { data: existingByLine } = await adminClient
            .from('profiles')
            .select('id, line_user_id')
            .eq('line_user_id', member.line_user_id)
            .maybeSingle();

          if (existingByLine) {
            results.skipped.push({
              phone: normalizedPhone,
              reason: 'Line User ID นี้มีอยู่ในระบบแล้ว'
            });
            continue;
          }
        }

        // Validate member_type
        const validMemberTypes = ['farm', 'company_employee', 'veterinarian', 'livestock_shop', 'government', 'other'];
        if (!validMemberTypes.includes(member.member_type)) {
          results.failed.push({
            phone: normalizedPhone,
            error: `member_type ไม่ถูกต้อง: ${member.member_type}`
          });
          continue;
        }

        // Validate tier if provided
        const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
        const tier = member.tier && validTiers.includes(member.tier) ? member.tier : 'bronze';

        // Insert profile (without user_id - will be linked when login via Line)
        const { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .insert({
            first_name: member.first_name.trim(),
            last_name: member.last_name.trim(),
            email: member.email?.trim() || null,
            nickname: member.nickname?.trim() || null,
            phone: normalizedPhone,
            line_id: member.line_id?.trim() || null,
            line_user_id: member.line_user_id?.trim() || null,
            address: member.address?.trim() || null,
            province: member.province?.trim() || null,
            district: member.district?.trim() || null,
            subdistrict: member.subdistrict?.trim() || null,
            postal_code: member.postal_code?.trim() || null,
            member_type: member.member_type,
            tier: tier,
            total_points: member.total_points || 0,
            total_coins: member.total_coins || 0,
            interests: member.interests || null,
            known_products: member.known_products || null,
            referral_source: member.referral_source?.trim() || null,
            approval_status: 'approved', // Auto-approve migrated members
            migrated_at: new Date().toISOString(),
            migration_source: 'csv_import'
          })
          .select()
          .single();

        if (profileError) {
          console.error('[import-members] Profile insert error:', profileError);
          throw new Error(profileError.message);
        }

        console.log('[import-members] Created profile:', profile.id, 'for phone:', normalizedPhone);

        // Insert occupation-specific details based on member_type
        if (member.member_type === 'farm' && member.farm_name) {
          const { error: farmError } = await adminClient
            .from('farm_details')
            .insert({
              profile_id: profile.id,
              farm_name: member.farm_name.trim(),
              position: member.farm_position?.trim() || null,
              animal_types: member.animal_types || null,
              animal_count: member.animal_count?.trim() || null,
              building_count: member.building_count?.trim() || null,
              pest_problems: member.pest_problems || null,
              pest_control_methods: member.pest_control_methods || null
            });

          if (farmError) {
            console.error('[import-members] Farm details error:', farmError);
          }
        }

        if (member.member_type === 'company_employee' && member.company_name) {
          // Validate business_type enum
          const validBusinessTypes = ['feed', 'farm_equipment', 'veterinary_distributor', 'animal_health', 'other'];
          const businessType = member.business_type && validBusinessTypes.includes(member.business_type) 
            ? member.business_type 
            : 'other';

          const { error: companyError } = await adminClient
            .from('company_details')
            .insert({
              profile_id: profile.id,
              company_name: member.company_name.trim(),
              business_type: businessType,
              position: member.company_position?.trim() || null,
              is_elanco: member.is_elanco || false
            });

          if (companyError) {
            console.error('[import-members] Company details error:', companyError);
          }
        }

        if (member.member_type === 'veterinarian' && member.vet_organization) {
          // Validate vet_type enum
          const validVetTypes = ['private_clinic', 'government', 'company', 'freelance'];
          const vetType = member.vet_type && validVetTypes.includes(member.vet_type) 
            ? member.vet_type 
            : 'freelance';

          const { error: vetError } = await adminClient
            .from('vet_details')
            .insert({
              profile_id: profile.id,
              organization_name: member.vet_organization.trim(),
              vet_type: vetType
            });

          if (vetError) {
            console.error('[import-members] Vet details error:', vetError);
          }
        }

        if (member.member_type === 'livestock_shop' && member.shop_name) {
          const { error: shopError } = await adminClient
            .from('shop_details')
            .insert({
              profile_id: profile.id,
              shop_name: member.shop_name.trim()
            });

          if (shopError) {
            console.error('[import-members] Shop details error:', shopError);
          }
        }

        if (member.member_type === 'government' && member.government_organization) {
          const { error: govError } = await adminClient
            .from('government_details')
            .insert({
              profile_id: profile.id,
              organization_name: member.government_organization.trim()
            });

          if (govError) {
            console.error('[import-members] Government details error:', govError);
          }
        }

        results.success.push(normalizedPhone);

      } catch (error) {
        console.error('[import-members] Error processing member:', member.phone, error);
        results.failed.push({
          phone: member.phone || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[import-members] Import completed:', {
      success: results.success.length,
      skipped: results.skipped.length,
      failed: results.failed.length
    });

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-members] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
