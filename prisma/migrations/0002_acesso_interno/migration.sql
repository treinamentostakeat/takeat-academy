-- Acesso interno: RH e colaborador, senha provisória e limite de tentativas de login.
-- Só adiciona colunas com valor padrão: as contas atuais continuam como estão.
ALTER TABLE "Usuario"
  ADD COLUMN "departamento" TEXT,
  ADD COLUMN "trocarSenha" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "falhasLogin" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bloqueadoAte" TIMESTAMP(3),
  ALTER COLUMN "cargo" SET DEFAULT 'colaborador';
