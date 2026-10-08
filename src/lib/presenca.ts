import 'server-only';
import { db } from './db';
import { agora, rotuloDia, faixa } from './datas';
import { hubspotPresenca } from './integracoes/hubspot';

/** Fecha a turma: grava encerradaEm, marca presença (quem entrou na sala) e avisa o HubSpot. Idempotente. */
export async function finalizarTurma(turmaId: string) {
  const t = await db.turma.findUnique({ where: { id: turmaId }, include: { inscricoes: { include: { restaurante: true } } } });
  if (!t || t.encerradaEm) return;
  const quando = new Date();
  await db.$transaction([
    db.turma.update({ where: { id: turmaId }, data: { encerradaEm: quando, iniciadaEm: t.iniciadaEm ?? (t.inscricoes.some((i) => i.entrouEm) ? quando : null) } }),
    db.inscricao.updateMany({ where: { turmaId, entrouEm: { not: null } }, data: { presente: true } }),
    db.inscricao.updateMany({ where: { turmaId, entrouEm: null }, data: { presente: false } }),
    db.inscricao.updateMany({ where: { turmaId, entrouEm: { not: null }, saiuEm: null }, data: { saiuEm: quando } }),
  ]);
  // Integrações nunca derrubam o encerramento
  await Promise.allSettled(t.inscricoes.map((i) => hubspotPresenca({
    cnpj: i.restaurante.cnpj, restaurante: i.restaurante.nome, pessoa: i.nome, tema: t.tema,
    quando: `${rotuloDia(t.data)}, ${faixa(t.hora)}`, presente: !!i.entrouEm,
  })));
}

/**
 * Encerramento automático: turmas cujo horário já acabou (com 30 min de folga) e que ninguém encerrou.
 * Roda sempre que uma agenda é carregada; assim a presença é marcada mesmo se a instrutora esquecer.
 */
export async function finalizarAulasPendentes() {
  const n = agora();
  const pendentes = await db.turma.findMany({
    where: { status: 'agendada', encerradaEm: null, data: { lte: n.data }, inscricoes: { some: {} } },
    select: { id: true, data: true, hora: true },
  });
  for (const t of pendentes) {
    if (t.data < n.data || n.hora >= t.hora + 1.5) await finalizarTurma(t.id);
  }
}
