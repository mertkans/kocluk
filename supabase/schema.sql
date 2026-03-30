-- =============================================
-- Ödev Takip Sistemi - Supabase / PostgreSQL Şeması
-- =============================================
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştırın.

-- UUID oluşturucu eklentisi
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS (Kullanıcılar) Tablosu
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  class_level TEXT,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student')) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. ASSIGNMENTS (Ödevler) Tablosu
-- =============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count > 0),
  option_count INTEGER NOT NULL CHECK (option_count IN (4, 5)),
  answer_key JSONB NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. ASSIGNMENT_STUDENTS (Ödev Atamaları) Tablosu
-- =============================================
CREATE TABLE IF NOT EXISTS assignment_students (
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (assignment_id, student_id)
);

-- =============================================
-- 4. SUBMISSIONS (Öğrenci Teslimleri) Tablosu
-- =============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  score JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =============================================

-- RLS'i etkinleştir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- ---- USERS ----
-- Admin her şeyi görebilir/yapabilir
CREATE POLICY "admin_all_users" ON users
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Öğretmen kendi profilini ve kendi oluşturduğu öğrencileri görebilir
CREATE POLICY "teacher_read_own_and_students" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'teacher'
      AND (role = 'student' AND created_by = auth.uid())
    )
  );

-- Öğrenci kendi profilini görebilir
CREATE POLICY "student_read_own" ON users
  FOR SELECT USING (
    auth.uid() = id AND role = 'student'
  );

-- ---- ASSIGNMENTS ----
CREATE POLICY "admin_all_assignments" ON assignments
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "teacher_crud_own_assignments" ON assignments
  FOR ALL USING (
    teacher_id = auth.uid()
  );

CREATE POLICY "student_read_assigned" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignment_students
      WHERE assignment_students.assignment_id = assignments.id
      AND assignment_students.student_id = auth.uid()
    )
  );

-- ---- ASSIGNMENT_STUDENTS ----
CREATE POLICY "admin_all_assignment_students" ON assignment_students
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "teacher_manage_own" ON assignment_students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = assignment_students.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

CREATE POLICY "student_read_own_assignments" ON assignment_students
  FOR SELECT USING (
    student_id = auth.uid()
  );

-- ---- SUBMISSIONS ----
CREATE POLICY "admin_all_submissions" ON submissions
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "teacher_read_own_submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = submissions.assignment_id
      AND assignments.teacher_id = auth.uid()
    )
  );

CREATE POLICY "student_manage_own_submissions" ON submissions
  FOR ALL USING (
    student_id = auth.uid()
  );
