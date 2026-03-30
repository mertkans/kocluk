import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'Kullanıcı ID zorunludur.' }, { status: 400 });
        }

        // Users tablosundan sil (CASCADE ile bağlı veriler otomatik silinir)
        const { error: dbError } = await supabaseAdmin.from('users').delete().eq('id', userId);
        if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

        // Supabase Auth'tan sil
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
