-- Vídeo de boas-vindas da trilha (link) e registro da primeira abertura de cada trilha por pessoa.
ALTER TABLE "Trilha" ADD COLUMN "boasVindas" TEXT NOT NULL DEFAULT '';

CREATE TABLE "TrilhaVista" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "vistaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrilhaVista_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrilhaVista_usuarioId_trilhaId_key" ON "TrilhaVista"("usuarioId", "trilhaId");
ALTER TABLE "TrilhaVista" ADD CONSTRAINT "TrilhaVista_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrilhaVista" ADD CONSTRAINT "TrilhaVista_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;
