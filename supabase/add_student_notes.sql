-- =============================================
-- Öğrenci Notları Tablosu
-- =============================================
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- Öğretmen kendi yazdığı notları yönetebilir
CREATE POLICY "teacher_manage_own_notes" ON student_notes
  FOR ALL USING (teacher_id = auth.uid());

-- Admin her şeyi görebilir
CREATE POLICY "admin_all_notes" ON student_notes
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
