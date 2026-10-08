
-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cargo" TEXT NOT NULL DEFAULT 'instrutor',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeSlot" (
    "id" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" INTEGER NOT NULL,
    "tema" TEXT NOT NULL,
    "instrutorId" TEXT NOT NULL,
    "plantaoId" TEXT NOT NULL,
    "valeDesde" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hora" INTEGER NOT NULL,
    "tema" TEXT NOT NULL,
    "instrutorId" TEXT NOT NULL,
    "plantaoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "canceladaEm" TIMESTAMP(3),
    "motivoCancel" TEXT,
    "iniciadaEm" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),
    "maosLiberadas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurante" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "hubspotId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscricao" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'avulso',
    "codigo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entrouEm" TIMESTAMP(3),
    "saiuEm" TIMESTAMP(3),
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "nota" INTEGER,
    "comentario" TEXT,

    CONSTRAINT "Inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integracao" (
    "id" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GradeSlot_diaSemana_hora_valeDesde_key" ON "GradeSlot"("diaSemana", "hora", "valeDesde");

-- CreateIndex
CREATE UNIQUE INDEX "Turma_data_hora_key" ON "Turma"("data", "hora");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurante_cnpj_key" ON "Restaurante"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Inscricao_codigo_key" ON "Inscricao"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Inscricao_turmaId_whatsapp_key" ON "Inscricao"("turmaId", "whatsapp");

-- AddForeignKey
ALTER TABLE "GradeSlot" ADD CONSTRAINT "GradeSlot_instrutorId_fkey" FOREIGN KEY ("instrutorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSlot" ADD CONSTRAINT "GradeSlot_plantaoId_fkey" FOREIGN KEY ("plantaoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_instrutorId_fkey" FOREIGN KEY ("instrutorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_plantaoId_fkey" FOREIGN KEY ("plantaoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscricao" ADD CONSTRAINT "Inscricao_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscricao" ADD CONSTRAINT "Inscricao_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Segurança: bloqueia o acesso pela API pública do Supabase (o app usa conexão direta, que não passa por RLS)
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GradeSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Turma" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Restaurante" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inscricao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integracao" ENABLE ROW LEVEL SECURITY;
