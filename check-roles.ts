import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function checkRoles() {
    console.log("Fetching roles...");
    const { data, error } = await supabase.from('roles').select('*');
    if (error) console.error("Error:", error);
    else console.log("Roles:", data);
}

checkRoles();
