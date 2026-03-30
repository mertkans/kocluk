-- Submissions tablosunda created_at'i null olanları bugünün tarihi yap (zaten default now() var ama bozulan varsa)
UPDATE submissions SET created_at = NOW() WHERE created_at IS NULL;
-- Assignments tablosunda created_at'i null olanları bugünün tarihi yap
UPDATE assignments SET created_at = NOW() WHERE created_at IS NULL;
