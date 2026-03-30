import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }

        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Ad, email ve şifre zorunludur.' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 });
        }

        // 1. Supabase Auth'a öğretmeni kaydet (Admin API — email onayı otomatik)
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

        // 2. Users tablosuna öğretmen profilini ekle (Admin API — RLS atlanır)
        const { error: profileError } = await supabaseAdmin.from('users').insert([
            {
                id: authUser.user.id,
                name,
                email,
                role: 'teacher',
            },
        ]);

        if (profileError) {
            // Hata olursa auth kaydını geri al
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            teacher: {
                id: authUser.user.id,
                name,
                email,
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
