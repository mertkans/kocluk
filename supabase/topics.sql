-- =============================================
-- KONU (TOPICS) TABLOSU + ASSIGNMENTS GÜNCELLEMESİ
-- =============================================
-- Supabase SQL Editor'de çalıştırın.

-- =============================================
-- 1. TOPICS TABLOSU
-- =============================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, name)
);

-- =============================================
-- 2. ASSIGNMENTS TABLOSUNA question_topics SÜTUNU EKLE
-- =============================================
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS question_topics JSONB DEFAULT '{}';

-- =============================================
-- 3. RLS (Row Level Security)
-- =============================================
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Öğretmen kendi konularını yönetebilir
CREATE POLICY "topics_teacher_all" ON topics
  FOR ALL USING (teacher_id = auth.uid());

-- Admin tüm konulara erişebilir
CREATE POLICY "topics_admin_all" ON topics
  FOR ALL USING (get_my_role() = 'admin');
