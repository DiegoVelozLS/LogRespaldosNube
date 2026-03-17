import fs from 'fs';
import path from 'path';

// Read .env.local or .env
const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) envVars[k.trim()] = v.trim();
});

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

async function check() {
    const res = await fetch(`${url}/rest/v1/roles`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const roles = await res.json();
    console.log('ROLES:', roles);
}

check();
