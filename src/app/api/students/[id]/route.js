import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase yapılandırılmamış.' }, { status: 500 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Öğrenci ID eksik.' }, { status: 400 });
        }

        const body = await request.json();
        const { name, phone, classId, email, defaultLessonPrice } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Ad Soyad zorunludur.' }, { status: 400 });
        }

        // Users tablosunu güncelle
        const updateData = {
            name: name.trim(),
            phone: phone?.trim() || null,
            default_lesson_price: defaultLessonPrice !== undefined
                ? (defaultLessonPrice === '' || defaultLessonPrice === null ? null : parseFloat(defaultLessonPrice))
                : undefined,
        };

        // class_id varsa ekle (classes tablosu yoksa hata vermemesi için)
        if (classId !== undefined) {
            updateData.class_id = classId || null;
        }

        const { error: profileError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id);

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 500 });
        }

        // Email değişmişse Auth'ta da güncelle
        if (email?.trim()) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                email: email.trim(),
            });
            if (authError) {
                return NextResponse.json({ error: 'Profil güncellendi ama email güncellenemedi: ' + authError.message }, { status: 500 });
            }

            // Users tablosundaki email'i de güncelle
            await supabaseAdmin.from('users').update({ email: email.trim() }).eq('id', id);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
