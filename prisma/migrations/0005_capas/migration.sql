-- Foto de capa da trilha e de cada vídeo (Supabase Storage). Só adiciona colunas com valor padrão.
ALTER TABLE "Trilha" ADD COLUMN "capa" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Video" ADD COLUMN "capa" TEXT NOT NULL DEFAULT '';
