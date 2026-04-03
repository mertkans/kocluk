import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }
        const body = await request.json();
        const { name, email, phone, classId, teacherId } = body;

        if (!name || !email || !teacherId) {
            return NextResponse.json({ error: 'Ad, email ve öğretmen ID zorunludur.' }, { status: 400 });
        }

        // Rastgele şifre oluştur (8 karakter)
        const generatedPassword =
            Math.random().toString(36).slice(-4).toUpperCase() +
            Math.random().toString(36).slice(-4);

        // Supabase Auth'a öğrenciyi kaydet (Admin API)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: { plain_password: generatedPassword },
        });

        if (authError) {
            if (authError.message?.includes('already been registered')) {
                return NextResponse.json({ error: 'Bu email adresi zaten kayıtlı.' }, { status: 400 });
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Users tablosuna öğrenci profilini ekle
        const { error: profileError } = await supabaseAdmin.from('users').insert([
            {
                id: authUser.user.id,
                name,
                email,
                phone: phone || null,
                class_id: classId || null,
                role: 'student',
                created_by: teacherId,
            },
        ]);

        if (profileError) {
            // Auth geri al
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            student: {
                id: authUser.user.id,
                name,
                email,
                password: generatedPassword,
            },
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
