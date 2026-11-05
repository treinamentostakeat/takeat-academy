'use server';
import { z } from 'zod';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { corrigir } from '@/lib/aprendizagem';
import { exigirPessoa } from '@/lib/sessao';
import { cursoParaAluno } from '@/lib/trilhas';

export type ResultadoQuiz =
  | { ok: true; acertos: number; total: number; minimo: number; aprovada: boolean; revisao: { enunciado: string; alternativas: string[]; marcada: number | null; correta: number }[] }
  | { ok: false; erro: string };

const Entrada = z.object({ cursoId: z.string().min(1).max(64), respostas: z.record(z.string(), z.number().int().min(0).max(20)) });

/** Corrige no servidor (o gabarito nunca vai para o navegador antes), registra a tentativa e guarda o melhor resultado aprovado. */
export async function enviarQuiz(dados: z.input<typeof Entrada>): Promise<ResultadoQuiz> {
  const eu = await exigirPessoa();
  const p = Entrada.safeParse(dados);
  if (!p.success) return { ok: false, erro: 'Respostas inválidas. Recarregue a página e tente de novo.' };
  // Mesma regra de visibilidade da página do curso
  if (!(await cursoParaAluno(p.data.cursoId, eu))) return { ok: false, erro: 'Curso não encontrado.' };
  const curso = await db.curso.findUniqueOrThrow({ where: { id: p.data.cursoId }, include: { perguntas: { orderBy: { ordem: 'asc' } } } });
  if (!curso.perguntas.length) return { ok: false, erro: 'Este curso ainda não tem perguntas.' };

  const marcadas = curso.perguntas.map((q) => p.data.respostas[q.id] ?? null);
  const r = corrigir(curso.perguntas.map((q) => q.correta), marcadas, curso.aprovacao);

  await db.tentativa.create({ data: { usuarioId: eu.id, cursoId: curso.id, acertos: r.acertos, total: r.total, aprovada: r.aprovada } });
  if (r.aprovada) {
    const atual = await db.progresso.findUnique({ where: { usuarioId_cursoId: { usuarioId: eu.id, cursoId: curso.id } } });
    if (!atual || r.acertos > atual.acertos) {
      await db.progresso.upsert({
        where: { usuarioId_cursoId: { usuarioId: eu.id, cursoId: curso.id } },
        update: { acertos: r.acertos, total: r.total, concluidoEm: new Date() },
        create: { usuarioId: eu.id, cursoId: curso.id, acertos: r.acertos, total: r.total },
      });
    }
    refresh();
  }
  return {
    ok: true, ...r,
    revisao: curso.perguntas.map((q, i) => ({ enunciado: q.enunciado, alternativas: q.alternativas, marcada: marcadas[i], correta: q.correta })),
  };
}
