import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }

        const { id } = params;
        if (!id) {
            return NextResponse.json({ error: 'Öğrenci ID eksik.' }, { status: 400 });
        }

        // 1. Kullanıcıyı Admin API ile çek
        const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(id);

        if (userError || !user?.user) {
            return NextResponse.json({ error: 'Öğrenci bulunamadı veya Auth bilgisine ulaşılamadı.' }, { status: 404 });
        }

        let plainPassword = user.user.user_metadata?.plain_password;

        // 2. Eğer plain_password yoksa (eski kayıtlar için), yeni şifre oluştur, kaydet ve döndür
        if (!plainPassword) {
            plainPassword = Math.random().toString(36).slice(-4).toUpperCase() + Math.random().toString(36).slice(-4);
            
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                password: plainPassword,
                user_metadata: { ...user.user.user_metadata, plain_password: plainPassword }
            });

            if (updateError) {
                return NextResponse.json({ error: 'Eski kayıt için şifre güncellenemedi.' }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            password: plainPassword,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
