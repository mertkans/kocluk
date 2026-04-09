-- =============================================
-- HAZIR CEVAP ANAHTARLARI — answer_key_templates
-- Supabase SQL Editor'de çalıştırın.
-- =============================================

-- Tablo oluştur
CREATE TABLE IF NOT EXISTS public.answer_key_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    question_count INT NOT NULL,
    option_count INT NOT NULL DEFAULT 5,
    answer_key JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Aynı öğretmende aynı isimde iki şablon olmasın
    UNIQUE (teacher_id, name)
);

-- RLS etkinleştir
ALTER TABLE public.answer_key_templates ENABLE ROW LEVEL SECURITY;

-- Sadece kendi şablonlarını görebilsin / düzenleyebilsin / ekleyebilsin / silebilsin
CREATE POLICY "akt_teacher_all" ON public.answer_key_templates
    FOR ALL USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());
