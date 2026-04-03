-- =============================================
-- SINIFLAR (CLASSES) TABLOSU + USERS GÜNCELLEMESİ
-- =============================================
-- Supabase SQL Editor'de çalıştırın.

-- =============================================
-- 1. CLASSES TABLOSU
-- =============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, name)
);

-- =============================================
-- 2. USERS TABLOSUNA class_id SÜTUNU EKLE
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- =============================================
-- 3. RLS (Row Level Security)
-- =============================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Öğretmen kendi sınıflarını yönetebilir
CREATE POLICY "classes_teacher_all" ON classes
  FOR ALL USING (teacher_id = auth.uid());

-- Admin tüm sınıflara erişebilir
CREATE POLICY "classes_admin_all" ON classes
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
