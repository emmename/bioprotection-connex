import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL="(.*)"/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1].trim();
const supabase = createClient(url, key);

const { data, error } = await supabase.from('missions').select('*').eq('id', 'a901ffba-4b2a-4a94-aa32-2b2c4a62db6d');
if (error) console.error(error);
console.log(JSON.stringify(data, null, 2));
