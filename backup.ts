import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE_URL = "https://irntguqcbpecqyicqura.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybnRndXFjYnBlY3F5aWNxdXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTI2NDUsImV4cCI6MjA4MjIyODY0NX0.rUI9JuYu5GSk5zvFTZtDrH5MVUBipaxnl5AyKOoKOW4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
    "profiles",
    "company_details",
    "farm_details",
    "government_details",
    "missions",
    "mission_completions",
    "rewards",
    "redemptions",
    "receipts",
    "content",
    "content_progress",
    "daily_checkins",
    "checkin_rewards",
    "points_transactions",
    "coins_transactions",
    "game_settings",
    "game_sessions",
    "notifications",
    "system_settings",
    "quiz_questions",
    "tier_settings",
    "reward_categories",
];

async function backup() {
    console.log("🚀 Starting backup...\n");

    await mkdir("backup_data", { recursive: true });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < TABLES.length; i++) {
        const table = TABLES[i];
        const progress = `[${i + 1}/${TABLES.length}]`;

        process.stdout.write(`${progress} ${table}... `);

        try {
            const { data, error } = await supabase.from(table).select("*");

            if (error) {
                console.log(`❌ ${error.message}`);
                errorCount++;
                continue;
            }

            if (data && data.length > 0) {
                await writeFile(
                    join("backup_data", `${table}.json`),
                    JSON.stringify(data, null, 2)
                );
                console.log(`✅ ${data.length} rows saved`);
                successCount++;
            } else {
                console.log(`⚠️ empty (0 rows)`);
                successCount++;
            }
        } catch (e: unknown) {
            console.log(`❌ ${e instanceof Error ? e.message : "Unknown error"}`);
            errorCount++;
        }
    }

    console.log(`\n🏁 Backup complete!`);
    console.log(`   ✅ Success: ${successCount} tables`);
    console.log(`   ❌ Errors: ${errorCount} tables`);
    console.log(`   📁 Files saved in: ./backup_data/`);
}

backup();
