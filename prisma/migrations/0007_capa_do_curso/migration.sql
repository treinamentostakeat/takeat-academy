-- Foto de capa do curso (Supabase Storage). Só adiciona uma coluna com valor padrão.
ALTER TABLE "Curso" ADD COLUMN "capa" TEXT NOT NULL DEFAULT '';
