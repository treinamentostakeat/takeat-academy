import 'server-only';
import { db } from './db';
import { podeEditarConteudo } from './permissoes';
import type { UsuarioSessao } from './sessao';

/* Leitura das trilhas para quem aprende. Quem edita conteúdo (gestor e RH) também vê o que não está publicado. */

export async function trilhasDoUsuario(u: UsuarioSessao) {
  const editor = podeEditarConteudo(u.cargo);
  const [trilhas, feitos] = await Promise.all([
    db.trilha.findMany({
      where: editor ? {} : { publicada: true },
      orderBy: { criadoEm: 'asc' },
      include: { etapas: { orderBy: { ordem: 'asc' }, include: { cursos: { where: editor ? {} : { publicado: true }, orderBy: { ordem: 'asc' }, select: { id: true, titulo: true, resumo: true, area: true, publicado: true, _count: { select: { perguntas: true } } } } } } },
    }),
    db.progresso.findMany({ where: { usuarioId: u.id }, select: { cursoId: true, acertos: true, total: true } }),
  ]);
  const notas = new Map(feitos.map((p) => [p.cursoId, p]));
  return trilhas.map((t) => {
    const cursos = t.etapas.flatMap((e) => e.cursos);
    const concluidos = cursos.filter((c) => notas.has(c.id)).length;
    return { ...t, total: cursos.length, concluidos, proximo: cursos.find((c) => !notas.has(c.id)) ?? null, notas };
  });
}
export type TrilhaAluno = Awaited<ReturnType<typeof trilhasDoUsuario>>[number];

/** Curso para quem aprende: sem o gabarito das perguntas. null se não existe ou não está publicado. */
export async function cursoParaAluno(id: string, u: UsuarioSessao) {
  const editor = podeEditarConteudo(u.cargo);
  const c = await db.curso.findUnique({
    where: { id },
    include: {
      etapa: { include: { trilha: { include: { etapas: { orderBy: { ordem: 'asc' }, include: { cursos: { where: editor ? {} : { publicado: true }, orderBy: { ordem: 'asc' }, select: { id: true, titulo: true } } } } } } } },
      videos: { where: { url: { not: '' } }, orderBy: { ordem: 'asc' } },
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
  return {
    id: c.id, titulo: c.titulo, area: c.area, resumo: c.resumo, aprender: c.aprender, texto: c.texto, contato: c.contato,
    aprovacao: Math.min(c.aprovacao, c.perguntas.length), publicado: c.publicado,
    videos: c.videos.map((v) => ({ id: v.id, titulo: v.titulo, duracao: v.duracao, url: v.url })),
    materiais: c.materiais.map((m) => ({ id: m.id, titulo: m.titulo, descricao: m.descricao, url: m.url })),
    perguntas: c.perguntas,
    progresso: c.progressos[0] ? { acertos: c.progressos[0].acertos, total: c.progressos[0].total } : null,
    trilha: { id: trilha.id, titulo: trilha.titulo, publicada: trilha.publicada },
    etapa: c.etapa.nome,
    posicao: pos + 1, totalCursos: ordem.length,
    proximo: ordem[pos + 1] ?? null,
  };
}
export type CursoAlunoDados = NonNullable<Awaited<ReturnType<typeof cursoParaAluno>>>;
