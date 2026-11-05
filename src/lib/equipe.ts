import 'server-only';
import { db } from './db';
import { FIM_AGENDA, garantirTurmas } from './turmas';
import { finalizarAulasPendentes } from './presenca';
import { hoje, rotuloDia, situacao } from './datas';
import { CARGOS_EQUIPE } from './permissoes';
import { HORARIOS } from './temas';

/* Dados da área da equipe: agenda (semana/dia), detalhe da turma, grade modelo e usuários. */

export const CANAL: Record<string, string> = { grupo: 'Link do grupo', botao: 'Botão no sistema', avulso: 'Link avulso' };
export const DIAS_GRADE = [1, 2, 3, 4, 5] as const;
export const NOME_DIA: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };

export const primeiroNome = (nome: string) => nome.split(/\s+/)[0] || nome;
/** "quinta, 9 de outubro, às 13h" (texto das mensagens) */
export const quandoTurma = (data: string, hora: number) => `${rotuloDia(data).toLowerCase()}, às ${hora}h`;
/** WhatsApp mascarado: (11) 9••••-4321 */
export function whatsMascarado(w: string) {
  const d = (w || '').replace(/\D/g, '');
  if (d.length < 10) return '—';
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)}••••-${d.slice(-4)}`;
}
export const fmt1 = (n: number) => n.toFixed(1).replace('.', ',');

export type Sit = ReturnType<typeof situacao>;

/** Turmas de um período com números de inscritos, presentes, avaliações e dúvidas tiradas. */
export async function agendaDoPeriodo(de: string, ate: string) {
  // Não cria turmas além do fim da agenda aberta
  const limite = ate < FIM_AGENDA ? ate : FIM_AGENDA;
  if (de <= limite) await garantirTurmas(de, limite);
  await finalizarAulasPendentes();
  const turmas = await db.turma.findMany({
    where: { data: { gte: de, lte: ate } },
    orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    include: {
      instrutor: { select: { id: true, nome: true } },
      plantao: { select: { id: true, nome: true } },
      inscricoes: { select: { presente: true, nota: true } },
    },
  });
  return turmas.map(({ inscricoes, ...t }) => {
    const notas = inscricoes.map((i) => i.nota).filter((n): n is number => typeof n === 'number');
    return {
      ...t,
      sit: situacao(t),
      inscritos: inscricoes.length,
      presentes: inscricoes.filter((i) => i.presente).length,
      avaliacoes: notas.length,
      media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
    };
  });
}
export type TurmaAgenda = Awaited<ReturnType<typeof agendaDoPeriodo>>[number];

/** Detalhe da turma para o drawer */
export async function detalheTurma(id: string) {
  const t = await db.turma.findUnique({
    where: { id },
    include: {
      instrutor: { select: { id: true, nome: true } },
      plantao: { select: { id: true, nome: true } },
      inscricoes: { orderBy: { criadoEm: 'asc' }, include: { restaurante: { select: { nome: true } } } },
    },
  });
  if (!t) return null;
  const notas = t.inscricoes.map((i) => i.nota).filter((n): n is number => typeof n === 'number');
  return {
    ...t,
    sit: situacao(t),
    presentes: t.inscricoes.filter((i) => i.presente).length,
    avaliacoes: notas.length,
    media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
    comentarios: t.inscricoes.filter((i) => i.comentario?.trim()),
  };
}

/** Pessoas que podem dar aula ou plantão (usuários ativos) */
export const pessoasAtivas = () =>
  db.usuario.findMany({ where: { ativo: true, cargo: { in: CARGOS_EQUIPE } }, orderBy: { nome: 'asc' }, select: { id: true, nome: true, cargo: true } });

/* ---------- Grade modelo ---------- */
export type Celula = { dia: number; hora: number; tema: string; instrutorId: string; plantaoId: string };

/**
 * Grade em edição: para cada dia/horário, a versão mais recente (se houver uma futura agendada, é ela;
 * senão a vigente, maior valeDesde <= hoje).
 */
export async function gradeAtual() {
  const slots = await db.gradeSlot.findMany({ orderBy: { valeDesde: 'desc' } });
  const h = hoje();
  const celulas: Celula[] = [];
  for (const dia of DIAS_GRADE) {
    for (const hora of HORARIOS) {
      const s = slots.find((x) => x.diaSemana === dia && x.hora === hora);
      if (s) celulas.push({ dia, hora, tema: s.tema, instrutorId: s.instrutorId, plantaoId: s.plantaoId });
    }
  }
  const versoes = [...new Set(slots.map((s) => s.valeDesde))].sort();
  const vigente = versoes.filter((v) => v <= h).pop() ?? null;
  const futura = versoes.filter((v) => v > h).pop() ?? null;
  return { celulas, vigente, futura };
}
