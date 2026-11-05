'use server';
import { z } from 'zod';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { CARGOS_EQUIPE } from '@/lib/permissoes';
import { exigirUsuario } from '@/lib/sessao';
import { diaSemana, hoje, parse } from '@/lib/datas';
import { HORARIOS, isTema } from '@/lib/temas';
import { DIAS_GRADE } from '@/lib/equipe';

export type ResultadoGrade =
  | { ok: true; valeDesde: string; atualizadas: number; mantidas: number }
  | { ok: false; erro: string };

const Celula = z.object({
  dia: z.number().int().min(1).max(5),
  hora: z.number().int(),
  tema: z.string().refine((t) => isTema(t), 'Tema inválido'),
  instrutorId: z.string().min(1),
  plantaoId: z.string().min(1),
});
const Grade = z.object({
  valeDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  celulas: z.array(Celula).length(DIAS_GRADE.length * HORARIOS.length),
});

/**
 * Salva uma nova versão da grade modelo valendo a partir de `valeDesde` (data futura).
 * Turmas já geradas a partir dessa data e SEM inscrição passam a seguir a nova grade;
 * as que já têm inscritos ficam como estão.
 */
export async function salvarGrade(dados: z.input<typeof Grade>): Promise<ResultadoGrade> {
  await exigirUsuario({ gestor: true });
  const p = Grade.safeParse(dados);
  if (!p.success) return { ok: false, erro: 'A grade está incompleta. Recarregue a página e tente de novo.' };
  const { valeDesde, celulas } = p.data;
  if (Number.isNaN(parse(valeDesde).getTime())) return { ok: false, erro: 'Data de início inválida.' };
  if (valeDesde <= hoje()) return { ok: false, erro: 'Escolha uma data a partir de amanhã.' };

  const chaves = new Set(celulas.map((c) => `${c.dia}|${c.hora}`));
  const completas = DIAS_GRADE.every((d) => HORARIOS.every((h) => chaves.has(`${d}|${h}`)));
  if (!completas) return { ok: false, erro: 'A grade precisa ter os 25 horários preenchidos.' };

  const ids = [...new Set(celulas.flatMap((c) => [c.instrutorId, c.plantaoId]))];
  const ativos = await db.usuario.count({ where: { id: { in: ids }, ativo: true, cargo: { in: CARGOS_EQUIPE } } });
  if (ativos !== ids.length) return { ok: false, erro: 'Há pessoa desativada na grade. Troque por alguém ativo da equipe.' };

  const porChave = new Map(celulas.map((c) => [`${c.dia}|${c.hora}`, c]));
  const resultado = await db.$transaction(async (tx) => {
    // A nova versão substitui versões agendadas para depois dela
    await tx.gradeSlot.deleteMany({ where: { valeDesde: { gte: valeDesde } } });
    await tx.gradeSlot.createMany({
      data: celulas.map((c) => ({ diaSemana: c.dia, hora: c.hora, tema: c.tema, instrutorId: c.instrutorId, plantaoId: c.plantaoId, valeDesde })),
    });

    const turmas = await tx.turma.findMany({
      where: { data: { gte: valeDesde }, status: 'agendada' },
      select: { id: true, data: true, hora: true, tema: true, instrutorId: true, plantaoId: true, _count: { select: { inscricoes: true } } },
    });
    let atualizadas = 0, mantidas = 0;
    for (const t of turmas) {
      const c = porChave.get(`${diaSemana(t.data)}|${t.hora}`);
      if (!c) continue;
      const muda = c.tema !== t.tema || c.instrutorId !== t.instrutorId || c.plantaoId !== t.plantaoId;
      if (!muda) continue;
      if (t._count.inscricoes > 0) { mantidas++; continue; }
      await tx.turma.update({ where: { id: t.id }, data: { tema: c.tema, instrutorId: c.instrutorId, plantaoId: c.plantaoId } });
      atualizadas++;
    }
    return { atualizadas, mantidas };
  });

  refresh();
  return { ok: true, valeDesde, ...resultado };
}
