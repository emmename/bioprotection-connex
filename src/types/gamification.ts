export interface TierSettings {
    tier: string;
    display_name: string;
    min_points: number;
    max_points: number | null;
    benefits: string[];
}

export interface PointsTransaction {
    id: string;
    profile_id: string;
    amount: number;
    transaction_type: 'earn' | 'redeem' | 'expire' | 'adjust';
    description: string | null;
    source: string;
    reference_id?: string | null;
    created_at: string;
}

export interface CoinsTransaction {
    id: string;
    profile_id: string;
    amount: number;
    transaction_type: 'earn' | 'spend' | 'expire' | 'adjust';
    description: string | null;
    source: string;
    reference_id?: string | null;
    created_at: string;
}

export interface DailyCheckin {
    id: string;
    profile_id: string;
    checkin_date: string;
    streak_count: number;
    coins_earned: number;
    created_at: string;
}

export interface Mission {
    id: string;
    title: string;
    description: string | null;
    points_reward: number;
    coins_reward: number;
    mission_type: string;
    requirements?: {
        targeting?: {
            member_types?: string[];
            tiers?: string[];
        };
        reward_overrides?: Array<{
            type: 'member_type' | 'tier';
            value: string;
            points: number;
        }>;
    } | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
    qr_code?: string | null;
}

export interface DailyMissionStatus {
    checkin: boolean;
    receipt: boolean;
    article: boolean;
    video: boolean;
    quiz: boolean;
}
