import 'server-only';
import { armazenamentoAtivo, linksDasCapas, linksDeLeitura } from './armazenamento';
import { db } from './db';
import { podeEditarConteudo } from './permissoes';
import type { UsuarioSessao } from './sessao';

/* Leitura das trilhas para quem aprende. Quem edita conteúdo (gestor e RH) também vê o que não está publicado. */

export async function trilhasDoUsuario(u: UsuarioSessao) {
  const editor = podeEditarConteudo(u.cargo);
  const [trilhas, feitos, comecados] = await Promise.all([
    db.trilha.findMany({
      where: editor ? {} : { publicada: true },
      orderBy: { criadoEm: 'asc' },
      include: { etapas: { orderBy: { ordem: 'asc' }, include: { cursos: { where: editor ? {} : { publicado: true }, orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, resumo: true, area: true, publicado: true, capa: true, _count: { select: { perguntas: true } } } } } } },
    }),
    db.progresso.findMany({ where: { usuarioId: u.id }, select: { cursoId: true, acertos: true, total: true } }),
    cursosComecados(u.id),
  ]);
  const notas = new Map(feitos.map((p) => [p.cursoId, p]));
  const capas = await linksDasCapas([...trilhas.map((t) => t.capa), ...trilhas.flatMap((t) => t.etapas.flatMap((e) => e.cursos.map((c) => c.capa)))]);
  return trilhas.map((t0) => {
    const t = { ...t0, etapas: t0.etapas.map((e) => ({ ...e, cursos: e.cursos.map((c) => ({ ...c, capaUrl: capas[c.capa] ?? null })) })) };
    const cursos = t.etapas.flatMap((e) => e.cursos);
    const concluidos = cursos.filter((c) => notas.has(c.id)).length;
    return { ...t, capaUrl: capas[t.capa] ?? null, total: cursos.length, concluidos, proximo: cursos.find((c) => !notas.has(c.id)) ?? null, notas, comecados };
  });
}
export type TrilhaAluno = Awaited<ReturnType<typeof trilhasDoUsuario>>[number];

/** Cursos que a pessoa já começou: abriu algum vídeo ou tentou o quiz (para "Continuar curso") */
async function cursosComecados(usuarioId: string) {
  const [vistos, tentativas] = await Promise.all([
    db.videoVisto.findMany({ where: { usuarioId }, select: { video: { select: { cursoId: true } } } }),
    db.tentativa.findMany({ where: { usuarioId }, select: { cursoId: true }, distinct: ['cursoId'] }),
  ]);
  return new Set([...vistos.map((v) => v.video.cursoId), ...tentativas.map((t) => t.cursoId)]);
}

/** Curso para quem aprende: sem o gabarito das perguntas. null se não existe ou não está publicado. */
export async function cursoParaAluno(id: string, u: UsuarioSessao) {
  const editor = podeEditarConteudo(u.cargo);
  const c = await db.curso.findUnique({
    where: { id },
    include: {
      etapa: { include: { trilha: { include: { etapas: { orderBy: { ordem: 'asc' }, include: { cursos: { where: editor ? {} : { publicado: true }, orderBy: { ordem: 'asc' }, select: { id: true, titulo: true } } } } } } } },
      videos: { where: { OR: [{ url: { not: '' } }, { arquivo: { not: '' } }] }, orderBy: { ordem: 'asc' } },
      materiais: { orderBy: { ordem: 'asc' } },
      perguntas: { orderBy: { ordem: 'asc' }, select: { id: true, enunciado: true, alternativas: true } },
      progressos: { where: { usuarioId: u.id } },
    },
  });
  if (!c) return null;
  const trilha = c.etapa.trilha;
  if (!editor && (!c.publicado || !trilha.publicada)) return null;
  const ordem = trilha.etapas.flatMap((e) => e.cursos);
  const pos = ordem.findIndex((x) => x.id === c.id);
  // Vídeo enviado: link assinado e temporário; se o Storage falhar, o vídeo some da lista em vez de quebrar a página
  const arquivos = c.videos.map((v) => v.arquivo).filter(Boolean);
  const [assinados, capas, feitos, vistos, tentou] = await Promise.all([
    arquivos.length && armazenamentoAtivo() ? linksDeLeitura(arquivos).catch(() => new Map<string, string | null>()) : new Map<string, string | null>(),
    linksDasCapas([c.capa, ...c.videos.map((v) => v.capa)]),
    db.progresso.findMany({ where: { usuarioId: u.id, cursoId: { in: ordem.map((x) => x.id) } }, select: { cursoId: true } }).then((l) => new Set(l.map((p) => p.cursoId))),
    db.videoVisto.findMany({ where: { usuarioId: u.id, videoId: { in: c.videos.map((v) => v.id) } }, orderBy: { atualizadoEm: 'desc' }, select: { videoId: true, segundos: true } }),
    db.tentativa.count({ where: { usuarioId: u.id, cursoId: c.id } }),
  ]);
  const pendentes = ordem.map((x, k) => ({ id: x.id, titulo: x.titulo, k })).filter((x) => x.id !== c.id && !feitos.has(x.id));
  const seguir = pendentes.find((x) => x.k > pos) ?? pendentes[0] ?? null;
  const videos = c.videos
    .map((v) => ({ id: v.id, titulo: v.titulo, duracao: v.duracao, url: v.arquivo ? assinados.get(v.arquivo) ?? '' : v.url, capa: capas[v.capa] ?? null }))
    .filter((v) => v.url);
  return {
    id: c.id, titulo: c.titulo, capa: capas[c.capa] ?? null, area: c.area, resumo: c.resumo, aprender: c.aprender, texto: c.texto, contato: c.contato,
    aprovacao: Math.min(c.aprovacao, c.perguntas.length), publicado: c.publicado,
    videos,
    materiais: c.materiais.map((m) => ({ id: m.id, titulo: m.titulo, descricao: m.descricao, url: m.url })),
    perguntas: c.perguntas,
    progresso: c.progressos[0] ? { acertos: c.progressos[0].acertos, total: c.progressos[0].total } : null,
    trilha: { id: trilha.id, titulo: trilha.titulo, publicada: trilha.publicada },
    etapa: c.etapa.nome,
    indiceEtapa: trilha.etapas.findIndex((e) => e.id === c.etapaId),
    posicao: pos + 1, totalCursos: ordem.length,
    proximo: ordem[pos + 1] ?? null,
    anterior: ordem[pos - 1] ?? null,
    /** Próximo curso ainda não concluído; null quando este é o último que falta (ou todos já foram feitos) */
    seguir: seguir ? { id: seguir.id, titulo: seguir.titulo } : null,
    /** Concluir este curso fecha a trilha */
    ultimo: pendentes.length === 0,
    /** Até onde assistiu cada vídeo (segundos) e o último vídeo aberto, para continuar de onde parou */
    posicoes: Object.fromEntries(vistos.map((v) => [v.videoId, v.segundos])) as Record<string, number>,
    ultimoVideo: vistos.find((v) => videos.some((x) => x.id === v.videoId))?.videoId ?? null,
    comecado: vistos.length > 0 || tentou > 0,
  };
}
export type CursoAlunoDados = NonNullable<Awaited<ReturnType<typeof cursoParaAluno>>>;

/* ---------- Jornada: boas-vindas, dia da jornada e turma ---------- */

/** Quando a pessoa abriu a trilha pela primeira vez (null = ainda não viu as boas-vindas). */
export async function vistaDaTrilha(usuarioId: string, trilhaId: string) {
  return (await db.trilhaVista.findUnique({ where: { usuarioId_trilhaId: { usuarioId, trilhaId } }, select: { vistaEm: true } }))?.vistaEm ?? null;
}

/** Marca que a pessoa viu as boas-vindas da trilha (só a primeira vez conta). */
export async function registrarVista(usuarioId: string, trilhaId: string) {
  await db.trilhaVista.upsert({ where: { usuarioId_trilhaId: { usuarioId, trilhaId } }, create: { usuarioId, trilhaId }, update: {} });
}

/** Dia da jornada: 1 no dia em que abriu a trilha, 2 no seguinte… (pelo fuso das aulas). */
export function diaDaJornada(desde: Date, hoje = new Date()) {
  const dia = (d: Date) => Date.parse(d.toLocaleDateString('en-CA', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo' }));
  return Math.max(1, Math.round((dia(hoje) - dia(desde)) / 86400000) + 1);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeDoMes = (d: Date) => MESES[Number(d.toLocaleDateString('en-CA', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo', month: 'numeric' })) - 1];

/** Mês e ano no fuso das aulas, ex. "2026-11" (a virada do mês segue o horário de Brasília, não o do servidor) */
export const mesDe = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo' }).slice(0, 7);

/** Ordena a turma: mais progresso primeiro; empate em ordem alfabética */
export const ordenarTurma = <T extends { nome: string; pct: number }>(l: T[]) =>
  [...l].sort((a, b) => b.pct - a.pct || a.nome.localeCompare(b.nome, 'pt-BR'));

/** Sua turma: colaboradores ativos cuja conta foi criada no mesmo mês ("Turma de novembro"), com o progresso
    nos cursos da trilha. Traz a turma inteira, já ordenada; a pessoa sempre aparece (como "Você"). */
export async function turmaDe(usuarioId: string, cursoIds: string[]) {
  const eu = await db.usuario.findUnique({ where: { id: usuarioId }, select: { criadoEm: true } });
  if (!eu) return { mes: null, pessoas: [] };
  const mes = mesDe(eu.criadoEm);
  // Janela larga no banco e o corte exato do mês aqui, pelo fuso de Brasília
  const de = new Date(eu.criadoEm.getTime() - 32 * 86400000), ate = new Date(eu.criadoEm.getTime() + 32 * 86400000);
  const candidatos = await db.usuario.findMany({
    where: { ativo: true, OR: [{ cargo: 'colaborador' }, { id: usuarioId }], criadoEm: { gte: de, lte: ate } },
    select: { id: true, nome: true, criadoEm: true, _count: { select: { progressos: { where: { cursoId: { in: cursoIds } } } } } },
  });
  const pct = (n: number) => (cursoIds.length ? Math.round((n / cursoIds.length) * 100) : 0);
  const pessoas = candidatos
    .filter((c) => c.id === usuarioId || mesDe(c.criadoEm) === mes)
    .map((c) => ({ id: c.id, nome: c.id === usuarioId ? 'Você' : c.nome, pct: pct(c._count.progressos), eu: c.id === usuarioId }));
  return { mes: nomeDoMes(eu.criadoEm), pessoas: ordenarTurma(pessoas) };
}
