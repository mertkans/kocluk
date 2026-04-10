-- =============================================
-- answer_key_templates tablosuna category sütunu ekle
-- Supabase SQL Editor'de çalıştırın.
-- =============================================

ALTER TABLE public.answer_key_templates
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;
