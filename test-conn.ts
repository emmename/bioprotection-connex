import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vdnmsjqwajcsrkfeqisu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkbm1zanF3YWpjc3JrZmVxaXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTQyNDUsImV4cCI6MjA4Njk5MDI0NX0.h7euGW6wh79tZn4LJV02sn_pKtB_IVr5RZR1Pri6PXY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("🔗 Testing connection to NEW Supabase project...\n");

    const tables = ["profiles", "missions", "content", "tier_settings", "checkin_rewards", "game_settings", "reward_categories"];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").limit(5);
        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: ${data.length} rows`);
        }
    }

    console.log("\n🏁 Connection test complete!");
}

test();
