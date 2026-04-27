-- =============================================
-- Tatil Bloğu Desteği — scheduled_lessons güncellemesi
-- =============================================

-- lesson_type kısıtını genişlet (holiday ekle)
ALTER TABLE scheduled_lessons
  DROP CONSTRAINT IF EXISTS scheduled_lessons_lesson_type_check;

ALTER TABLE scheduled_lessons
  ADD CONSTRAINT scheduled_lessons_lesson_type_check
  CHECK (lesson_type IN ('online', 'face_to_face', 'holiday'));

-- student_id'yi NULL'a izin verecek şekilde güncelle (tatil bloklarında öğrenci yok)
ALTER TABLE scheduled_lessons
  ALTER COLUMN student_id DROP NOT NULL;

-- label alanı ekle (tatil adı için, örn: "Bayram", "Haftalık Mola")
ALTER TABLE scheduled_lessons
  ADD COLUMN IF NOT EXISTS label TEXT;
