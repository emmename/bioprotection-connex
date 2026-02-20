import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileInput {
    id: string;
    member_type: string;
}

export function useMemberSubType(profile: ProfileInput | null | undefined) {
    const [subTypeLabel, setSubTypeLabel] = useState<string>('');
    const [subTypeValue, setSubTypeValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!profile?.id || !profile?.member_type) {
            setSubTypeLabel('');
            return;
        }

        const fetchSubType = async () => {
            setLoading(true);
            try {
                let label = '';
                const memberType = profile.member_type;

                if (memberType === 'farm') {
                    const { data } = await supabase
                        .from('farm_details')
                        .select('position')
                        .eq('profile_id', profile.id)
                        .single();

                    if (data?.position) {
                        const positionMap: Record<string, string> = {
                            'owner': 'เจ้าของกิจการ',
                            'farm_manager': 'ผู้จัดการฟาร์ม',
                            'animal_husbandry': 'สัตวบาล',
                            'admin': 'ธุรการ',
                            'other': 'อื่นๆ'
                        };
                        label = positionMap[data.position] || data.position;
                        setSubTypeValue(data.position);
                    }
                }
                else if (memberType === 'company_employee') {
                    const { data } = await supabase
                        .from('company_details')
                        .select('business_type, is_elanco')
                        .eq('profile_id', profile.id)
                        .single();

                    if (data) {
                        if (data.is_elanco) {
                            label = 'พนักงานอีแลนโค (Elanco)';
                        } else if (data.business_type) {
                            const businessMap: Record<string, string> = {
                                'animal_production': 'ผลิตสัตว์/ส่งออกหรือแปรรูปเนื้อสัตว์',
                                'animal_feed': 'ผลิตอาหารสัตว์',
                                'veterinary_distribution': 'จัดจำหน่ายเวชภัณฑ์สัตว์',
                                'other': 'อื่นๆ'
                            };
                            label = businessMap[data.business_type] || data.business_type;
                            setSubTypeValue(data.business_type);
                        }
                    }
                }
                else if (memberType === 'veterinarian') {
                    const { data } = await supabase
                        .from('vet_details')
                        .select('vet_type')
                        .eq('profile_id', profile.id)
                        .single();

                    if (data?.vet_type) {
                        const vetMap: Record<string, string> = {
                            'livestock': 'สัตวแพทย์ประจำปศุสัตว์',
                            'hospital_clinic': 'สัตวแพทย์ประจำโรงพยาบาลสัตว์/คลินิก'
                        };
                        label = vetMap[data.vet_type] || data.vet_type;
                        setSubTypeValue(data.vet_type);
                    }
                }
                else if (memberType === 'livestock_shop') {
                    // For shops, we might just keep the generic name or fetch shop name if needed, 
                    // but usually "ร้านค้าปศุสัตว์" is sufficient as the "type".
                    // If user wants specific, maybe specific shop name? 
                    // The request says "sub-choice of member type". Shop doesn't have sub-choices in the enum.
                    // So we default to generic label.
                    label = 'ร้านค้าปศุสัตว์';
                }
                else if (memberType === 'government') {
                    label = 'รับราชการ';
                }

                // Fallback to generic names if specific lookup failed or returned nothing
                if (!label) {
                    const genericMap: Record<string, string> = {
                        farm: 'ฟาร์มเลี้ยงสัตว์',
                        company_employee: 'พนักงานบริษัท',
                        veterinarian: 'สัตวแพทย์',
                        livestock_shop: 'ร้านค้าปศุสัตว์',
                        government: 'หน่วยงานราชการ',
                        other: 'อื่นๆ',
                    };
                    label = genericMap[memberType] || memberType;
                }

                setSubTypeLabel(label);
            } catch (error) {
                console.error('Error fetching member sub-type:', error);
                // Fallback on error
                const genericMap: Record<string, string> = {
                    farm: 'ฟาร์มเลี้ยงสัตว์',
                    company_employee: 'พนักงานบริษัท',
                    veterinarian: 'สัตวแพทย์',
                    livestock_shop: 'ร้านค้าปศุสัตว์',
                    government: 'หน่วยงานราชการ',
                    other: 'อื่นๆ',
                };
                setSubTypeLabel(genericMap[profile.member_type] || profile.member_type);
            } finally {
                setLoading(false);
            }
        };

        fetchSubType();
    }, [profile?.id, profile?.member_type]);

    return { subTypeLabel, subTypeValue, loading };
}
