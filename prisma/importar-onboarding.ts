/* Importa a trilha de onboarding do protótipo do RH (prisma/conteudo/onboarding-rh.json) como conteúdo editável.
   Rodar: npm run db:importar-onboarding. Não repete: se já existe trilha com o mesmo título, não faz nada.
   A trilha entra como rascunho, e os vídeos entram sem link: o RH anexa e publica pela plataforma. */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

type Conteudo = {
  trilha: { titulo: string; descricao: string; publico: string };
  etapas: { nome: string; descricao: string; cursos: { titulo: string; area: string; resumo: string; aprender: string[]; texto: string; contato: string; videos: { titulo: string; duracao: string }[]; perguntas: { enunciado: string; alternativas: string[]; correta: number }[] }[] }[];
};

const db = new PrismaClient();

async function main() {
  const d = JSON.parse(readFileSync(new URL('./conteudo/onboarding-rh.json', import.meta.url), 'utf8')) as Conteudo;
  if (await db.trilha.findFirst({ where: { titulo: d.trilha.titulo } })) {
    console.log(`Já existe a trilha "${d.trilha.titulo}". Nada foi importado.`);
    return;
  }
  const t = await db.trilha.create({
    data: {
      ...d.trilha,
      publicada: false,
      etapas: {
        create: d.etapas.map((e, ei) => ({
          nome: e.nome, descricao: e.descricao, ordem: ei,
          cursos: {
            create: e.cursos.map((c, ci) => ({
              titulo: c.titulo, area: c.area, resumo: c.resumo, aprender: c.aprender, texto: c.texto, contato: c.contato, ordem: ci, aprovacao: 7, publicado: true,
              videos: { create: c.videos.map((v, vi) => ({ titulo: v.titulo, duracao: v.duracao, url: '', ordem: vi })) },
              perguntas: { create: c.perguntas.map((q, qi) => ({ ...q, ordem: qi })) },
            })),
          },
        })),
      },
    },
    include: { etapas: { include: { _count: { select: { cursos: true } } } } },
  });
  const cursos = t.etapas.reduce((n, e) => n + e._count.cursos, 0);
  console.log(`Trilha "${t.titulo}" importada como rascunho: ${t.etapas.length} etapas, ${cursos} cursos, ${await db.pergunta.count({ where: { curso: { etapa: { trilhaId: t.id } } } })} perguntas.`);
}

main().finally(() => db.$disconnect());
