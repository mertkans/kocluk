
-- Student Agenda Table
CREATE TABLE IF NOT EXISTS student_agendas (
  student_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE student_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own agenda" ON student_agendas
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' agenda" ON student_agendas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users s
      WHERE s.id = student_agendas.student_id
      AND s.role = 'student'
      AND s.created_by = auth.uid()
    )
  );
