-- =============================================
-- RLS TAMİRİ V2 — ÇAPRAZ TABLO DÖNGÜSÜNÜ KIRAN KESİN ÇÖZÜM
-- =============================================
-- Supabase SQL Editor'de çalıştırın.

-- =============================================
-- ADIM 1: TÜM ESKİ POLİTİKALARI SİL
-- =============================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- =============================================
-- ADIM 2: SECURITY DEFINER FONKSİYONLARI
-- (RLS'i tamamen bypass ederek çapraz tablo döngüsünü kırar)
-- =============================================

-- Kullanıcının rolünü döner
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Bir ödevin belirli bir öğretmene ait olup olmadığını kontrol eder
CREATE OR REPLACE FUNCTION is_my_assignment(a_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignments
    WHERE id = a_id AND teacher_id = auth.uid()
  );
$$;

-- Bir ödevin belirli bir öğrenciye atanıp atanmadığını kontrol eder
CREATE OR REPLACE FUNCTION is_assigned_to_me(a_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assignment_students
    WHERE assignment_id = a_id AND student_id = auth.uid()
  );
$$;

-- =============================================
-- ADIM 3: RLS ETKİNLEŞTİR
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ADIM 4: TEMİZ POLİTİKALAR (Hiç çapraz sorgu yok!)
-- =============================================

-- ===== USERS =====
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "users_teacher_see_students" ON users
  FOR SELECT USING (
    get_my_role() = 'teacher' AND role = 'student' AND created_by = auth.uid()
  );

-- ===== ASSIGNMENTS =====
CREATE POLICY "assignments_admin_all" ON assignments
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "assignments_teacher_all" ON assignments
  FOR ALL USING (teacher_id = auth.uid());

-- Öğrenci: SECURITY DEFINER fonksiyon ile kontrol (döngü yok!)
CREATE POLICY "assignments_student_select" ON assignments
  FOR SELECT USING (is_assigned_to_me(id));

-- ===== ASSIGNMENT_STUDENTS =====
CREATE POLICY "as_admin_all" ON assignment_students
  FOR ALL USING (get_my_role() = 'admin');

-- Öğretmen: SECURITY DEFINER fonksiyon ile kontrol (döngü yok!)
CREATE POLICY "as_teacher_all" ON assignment_students
  FOR ALL USING (is_my_assignment(assignment_id));

CREATE POLICY "as_student_select" ON assignment_students
  FOR SELECT USING (student_id = auth.uid());

-- ===== SUBMISSIONS =====
CREATE POLICY "submissions_admin_all" ON submissions
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "submissions_teacher_select" ON submissions
  FOR SELECT USING (is_my_assignment(assignment_id));

CREATE POLICY "submissions_student_all" ON submissions
  FOR ALL USING (student_id = auth.uid());
