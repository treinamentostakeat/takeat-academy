-- Vídeo enviado como arquivo (Supabase Storage), além do link. Só adiciona colunas com valor padrão.
ALTER TABLE "Video"
  ADD COLUMN "arquivo" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "nomeArquivo" TEXT NOT NULL DEFAULT '';
