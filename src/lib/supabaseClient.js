import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http');

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storageKey: 'kocluk-auth-token',
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        },
        global: { fetch: fetch.bind(globalThis) }
    })
    : null;
