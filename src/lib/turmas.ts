import 'server-only';
import { db } from './db';
import { diasUteis, diaSemana, hoje, somaDias } from './datas';
import { finalizarAulasPendentes } from './presenca';

/** Até onde as turmas ficam abertas para inscrição */
export const FIM_AGENDA = '2026-12-31';

/**
 * Cria (se faltarem) as turmas concretas entre duas datas a partir da grade modelo.
 * Para cada dia/horário vale a versão da grade com o maior valeDesde <= data.
 * Turmas já existentes nunca são alteradas aqui (trocas e cancelamentos ficam preservados).
 */
export async function garantirTurmas(de: string, ate: string) {
  const dias = diasUteis(de, ate);
  if (!dias.length) return;
  const [grade, existentes] = await Promise.all([
    db.gradeSlot.findMany({ orderBy: { valeDesde: 'desc' } }),
    db.turma.findMany({ where: { data: { gte: dias[0], lte: dias[dias.length - 1] } }, select: { data: true, hora: true } }),
  ]);
  const tem = new Set(existentes.map((t) => `${t.data}|${t.hora}`));
  const novas: { data: string; hora: number; tema: string; instrutorId: string; plantaoId: string }[] = [];
  for (const d of dias) {
    const w = diaSemana(d);
    const horas = new Set(grade.filter((g) => g.diaSemana === w).map((g) => g.hora));
    for (const h of horas) {
      if (tem.has(`${d}|${h}`)) continue;
      const g = grade.find((x) => x.diaSemana === w && x.hora === h && x.valeDesde <= d);
      if (g) novas.push({ data: d, hora: h, tema: g.tema, instrutorId: g.instrutorId, plantaoId: g.plantaoId });
    }
  }
  for (const t of novas) {
    await db.turma.upsert({ where: { data_hora: { data: t.data, hora: t.hora } }, update: {}, create: t });
  }
}

/** Turmas de um período com instrutor, plantão e contagem de inscritos */
export async function turmasDoPeriodo(de: string, ate: string) {
  await garantirTurmas(de, ate);
  await finalizarAulasPendentes();
  return db.turma.findMany({
    where: { data: { gte: de, lte: ate } },
    orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    include: {
      instrutor: { select: { id: true, nome: true } },
      plantao: { select: { id: true, nome: true } },
      _count: { select: { inscricoes: true } },
    },
  });
}

/** Garante a agenda aberta de hoje até o fim do ano (chamado ao abrir páginas de agenda) */
export const garantirAgendaAberta = () => garantirTurmas(somaDias(hoje(), -7), FIM_AGENDA);
