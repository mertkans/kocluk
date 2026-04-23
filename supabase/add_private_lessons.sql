-- =============================================
-- Özel Ders Takip Tabloları
-- =============================================

-- Öğrenciye varsayılan ders ücreti alanı ekle
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_lesson_price NUMERIC DEFAULT NULL;

-- Ders kayıtları
CREATE TABLE IF NOT EXISTS private_lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  lesson_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  subject TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ödeme kayıtları
CREATE TABLE IF NOT EXISTS lesson_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE private_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_manage_lessons" ON private_lessons
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "admin_all_lessons" ON private_lessons
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "teacher_manage_payments" ON lesson_payments
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "admin_all_payments" ON lesson_payments
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
