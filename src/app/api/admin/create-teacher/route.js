import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Ad, email ve şifre zorunludur.' }, { status: 400 });
        }

        // Supabase Auth'a öğretmen kaydet
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            if (authError.message?.includes('already been registered')) {
                return NextResponse.json({ error: 'Bu email adresi zaten kayıtlı.' }, { status: 400 });
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Users tablosuna öğretmen profilini ekle
        const { error: profileError } = await supabaseAdmin.from('users').insert([{
            id: authUser.user.id,
            name,
            email,
            role: 'teacher',
        }]);

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            teacher: { id: authUser.user.id, name, email },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
