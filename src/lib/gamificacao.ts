import 'server-only';
import { createHmac } from 'node:crypto';
import { cache } from 'react';
import { db } from './db';
import { calcular, type Evento } from './gamificacao-regras';
import { podeEditarConteudo } from './permissoes';
import type { UsuarioSessao } from './sessao';
import { mesDe, nomeDoMes } from './trilhas';

/* Gamificação: junta o que a pessoa fez (cursos, quizzes, vídeos) e aplica as regras de gamificacao-regras.ts.
   Também cuida do passaporte dos setores, dos certificados e do desafio entre turmas. */

/** Trilhas que a pessoa vê, com etapas e cursos (só ids e títulos) */
const trilhasVisiveis = cache(async (editor: boolean) =>
  db.trilha.findMany({
    where: editor ? {} : { publicada: true },
    orderBy: { criadoEm: 'asc' },
    select: { id: true, titulo: true, etapas: { orderBy: { ordem: 'asc' }, select: { nome: true, cursos: { where: editor ? {} : { publicado: true }, orderBy: { ordem: 'asc' }, select: { id: true, titulo: true } } } } },
  }));

/** Etapa do passaporte: a que fala de setores; sem nome assim, a segunda etapa (os setores vêm depois dos fundamentos) */
function etapaDosSetores<E extends { nome: string; cursos: unknown[] }>(etapas: E[]) {
  const com = etapas.filter((e) => e.cursos.length);
  return com.find((e) => /setor/i.test(e.nome)) ?? com[1] ?? null;
}

/** Gamificação completa de uma pessoa. Em cache por requisição (pela pessoa e cargo): o topo e a página usam o mesmo cálculo. */
export const jogoDe = (u: Pick<UsuarioSessao, 'id' | 'cargo'>) => jogoEmCache(u.id, u.cargo);
const jogoEmCache = cache(async (id: string, cargo: UsuarioSessao['cargo']) => {
  const u = { id, cargo };
  const editor = podeEditarConteudo(u.cargo);
  const [progressos, tentativas, vistos, trilhas] = await Promise.all([
    db.progresso.findMany({ where: { usuarioId: u.id }, select: { cursoId: true, acertos: true, total: true, concluidoEm: true } }),
    db.tentativa.findMany({ where: { usuarioId: u.id }, select: { cursoId: true, acertos: true, total: true, aprovada: true, criadoEm: true } }),
    db.videoVisto.findMany({ where: { usuarioId: u.id }, select: { atualizadoEm: true, video: { select: { cursoId: true } } } }),
    trilhasVisiveis(editor),
  ]);
  const eventos: Evento[] = [
    ...progressos.map((p) => ({ tipo: 'curso' as const, em: p.concluidoEm, cursoId: p.cursoId, acertos: p.acertos, total: p.total })),
    ...tentativas.map((t) => ({ tipo: 'quiz' as const, em: t.criadoEm, cursoId: t.cursoId, acertos: t.acertos, total: t.total, aprovada: t.aprovada })),
    ...vistos.map((v) => ({ tipo: 'video' as const, em: v.atualizadoEm, cursoId: v.video.cursoId })),
  ];
  const feitos = new Map(progressos.map((p) => [p.cursoId, p]));

  // Passaporte: na primeira trilha, cada setor concluído é um carimbo
  const principal = trilhas.find((t) => t.etapas.some((e) => e.cursos.length)) ?? null;
  const etapa = principal ? etapaDosSetores(principal.etapas) : null;
  const passaporte = etapa ? {
    trilhaId: principal!.id, etapa: etapa.nome,
    carimbos: etapa.cursos.map((c) => ({ id: c.id, titulo: c.titulo, em: feitos.get(c.id)?.concluidoEm ?? null })),
  } : null;
  const passaporteCompleto = !!passaporte && passaporte.carimbos.length > 0 && passaporte.carimbos.every((c) => c.em);

  // Certificados: trilhas com todos os cursos concluídos
  const certificados = trilhas.flatMap((t) => {
    const ids = t.etapas.flatMap((e) => e.cursos.map((c) => c.id));
    if (!ids.length || !ids.every((id) => feitos.has(id))) return [];
    const em = ids.reduce((d, id) => (feitos.get(id)!.concluidoEm > d ? feitos.get(id)!.concluidoEm : d), new Date(0));
    return [{ trilhaId: t.id, titulo: t.titulo, em, codigo: codigoCertificado(u.id, t.id) }];
  });

  const jogo = calcular(eventos, { passaporteCompleto, formaturas: certificados.length });
  const historico = progressos
    .map((p) => ({ ...p, titulo: trilhas.flatMap((t) => t.etapas.flatMap((e) => e.cursos)).find((c) => c.id === p.cursoId)?.titulo ?? 'Curso removido' }))
    .sort((a, b) => b.concluidoEm.getTime() - a.concluidoEm.getTime());
  return { ...jogo, passaporte, certificados, historico };
});
export type JogoCompleto = Awaited<ReturnType<typeof jogoEmCache>>;

/* ---------- Certificado ---------- */

/** Código de validação do certificado, ex. "TKA-7Q2M-XK9D". Não dá para adivinhar sem o SESSION_SECRET. */
export function codigoCertificado(usuarioId: string, trilhaId: string) {
  const segredo = process.env.SESSION_SECRET || '';
  const h = createHmac('sha256', segredo).update(`certificado:${usuarioId}:${trilhaId}`).digest();
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I
  const s = Array.from(h.subarray(0, 8), (b) => alfabeto[b % alfabeto.length]).join('');
  return `TKA-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Acha o certificado pelo código (para a página pública de validação). Só trilhas publicadas e concluídas. */
export async function buscarCertificado(codigo: string) {
  const c = codigo.trim().toUpperCase();
  if (!/^TKA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)) return null;
  const trilhas = await trilhasVisiveis(false);
  for (const t of trilhas) {
    const ids = t.etapas.flatMap((e) => e.cursos.map((x) => x.id));
    if (!ids.length) continue;
    // Quem concluiu todos os cursos da trilha
    const grupos = await db.progresso.groupBy({ by: ['usuarioId'], where: { cursoId: { in: ids } }, _count: { cursoId: true }, _max: { concluidoEm: true } });
    for (const g of grupos) {
      if (g._count.cursoId < ids.length || codigoCertificado(g.usuarioId, t.id) !== c) continue;
      const u = await db.usuario.findUnique({ where: { id: g.usuarioId }, select: { nome: true } });
      if (!u) return null;
      return { nome: u.nome, trilha: t.titulo, em: g._max.concluidoEm!, codigo: c };
    }
  }
  return null;
}

/* ---------- Desafio entre turmas ---------- */

/** % médio de conclusão da trilha por turma de entrada (mês em que a conta foi criada), das 4 turmas mais recentes */
export async function desafioDasTurmas(cursoIds: string[], usuarioId: string) {
  if (!cursoIds.length) return [];
  const pessoas = await db.usuario.findMany({
    where: { ativo: true, OR: [{ cargo: 'colaborador' }, { id: usuarioId }] },
    select: { id: true, criadoEm: true, _count: { select: { progressos: { where: { cursoId: { in: cursoIds } } } } } },
  });
  const turmas = new Map<string, { nome: string; soma: number; pessoas: number; minha: boolean }>();
  for (const p of pessoas) {
    const chave = mesDe(p.criadoEm);
    const t = turmas.get(chave) ?? { nome: `Turma de ${nomeDoMes(p.criadoEm)}`, soma: 0, pessoas: 0, minha: false };
    t.soma += p._count.progressos / cursoIds.length; t.pessoas++; if (p.id === usuarioId) t.minha = true;
    turmas.set(chave, t);
  }
  return [...turmas.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 4)
    .map(([chave, t]) => ({ chave, nome: t.nome, pessoas: t.pessoas, pct: Math.round((t.soma / t.pessoas) * 100), minha: t.minha }))
    .sort((a, b) => b.pct - a.pct);
}
