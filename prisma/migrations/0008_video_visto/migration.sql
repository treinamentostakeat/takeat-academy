-- Até onde cada pessoa assistiu cada vídeo (continuar de onde parou). Pode rodar mais de uma vez.
CREATE TABLE IF NOT EXISTS "VideoVisto" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "segundos" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoVisto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VideoVisto_usuarioId_videoId_key" ON "VideoVisto"("usuarioId", "videoId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VideoVisto_usuarioId_fkey') THEN
    ALTER TABLE "VideoVisto" ADD CONSTRAINT "VideoVisto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VideoVisto_videoId_fkey') THEN
    ALTER TABLE "VideoVisto" ADD CONSTRAINT "VideoVisto_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
