import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Checking employees table...");
    const { data, error } = await supabase.from('employees').select('id').limit(1);
    if (error) {
        console.error("Error accessing employees:", error);
    } else {
        console.log("Employees accessible. Found:", data.length);
    }
}

testConnection();
