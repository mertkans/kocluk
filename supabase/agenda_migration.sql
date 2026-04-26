-- =============================================
-- Öğretmen Ajandası — Planlanan Dersler Tablosu
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  lesson_type TEXT NOT NULL CHECK (lesson_type IN ('online', 'face_to_face')) DEFAULT 'face_to_face',
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',

  -- Tekrar eden ders sistemi
  recurring_group_id UUID,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,

  -- Ücret (onaylandığında private_lessons'a yazılacak)
  price NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_scheduled_lessons_teacher_date
  ON scheduled_lessons(teacher_id, lesson_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_lessons_recurring
  ON scheduled_lessons(recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;

-- RLS
ALTER TABLE scheduled_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_manage_scheduled_lessons" ON scheduled_lessons
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "admin_all_scheduled_lessons" ON scheduled_lessons
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
