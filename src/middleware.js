import { NextResponse } from 'next/server';

export async function middleware(request) {
    // Şu an middleware'i basit tutuyoruz.
    // Auth kontrolü client-side AuthProvider tarafından yapılıyor.
    // İleride Supabase SSR paketiyle güçlendirilebilir.
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
