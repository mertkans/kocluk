import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bu client SADECE sunucu tarafında kullanılmalıdır (API Routes / Server Actions)
// Eğer env değişkenleri yoksa dummy ile oluştur (build sırasında çökmesini engeller)
const isConfigured = supabaseUrl && serviceRoleKey && supabaseUrl.startsWith('http');

if (!isConfigured) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && !supabaseUrl.startsWith('http')) missing.push('NEXT_PUBLIC_SUPABASE_URL (geçersiz format)');
    console.warn(`[supabaseAdmin] Yapılandırma eksik — eksik değişkenler: ${missing.join(', ')}`);
}

export const supabaseAdmin = isConfigured
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : null;
