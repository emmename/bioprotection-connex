import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('mission_type', 'survey');

    console.log('Survey Missions:', JSON.stringify(missions, null, 2));

    for (const m of (missions || [])) {
        if (m.requirements?.content_id) {
            const { data: content } = await supabase
                .from('content')
                .select('id, is_published, content_type')
                .eq('id', m.requirements.content_id)
                .single();
            console.log(`Content for mission ${m.id}:`, content);
        }
    }
}

main().catch(console.error);
