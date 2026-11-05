'use server';
import { z } from 'zod';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { linkValido } from '@/lib/aprendizagem';
import { exigirEditorConteudo } from '@/lib/sessao';

/* Edição de trilhas, etapas e cursos (gestor e RH). Toda ação confere a permissão no servidor. */

export type Resultado = { ok: true; msg: string; id?: string } | { ok: false; erro: string };
const falha = (erro: string): Resultado => ({ ok: false, erro });
const Id = z.string().min(1).max(64);
const Dir = z.union([z.literal(-1), z.literal(1)]);
const texto = (max: number) => z.string().trim().max(max, `Use até ${max} caracteres.`);

/* ---------- Trilha ---------- */
export async function criarTrilha(titulo: string): Promise<Resultado> {
  await exigirEditorConteudo();
  const t = texto(120).min(3, 'Dê um título com pelo menos 3 letras.').safeParse(titulo);
  if (!t.success) return falha(t.error.issues[0].message);
  const nova = await db.trilha.create({ data: { titulo: t.data, etapas: { create: { nome: 'Etapa 1', ordem: 0 } } } });
  return { ok: true, msg: 'Trilha criada.', id: nova.id };
}

const TrilhaSchema = z.object({ id: Id, titulo: texto(120).min(3, 'Dê um título com pelo menos 3 letras.'), descricao: texto(600), publico: texto(80), publicada: z.boolean() });
export async function salvarTrilha(dados: z.input<typeof TrilhaSchema>): Promise<Resultado> {
  await exigirEditorConteudo();
  const p = TrilhaSchema.safeParse(dados);
  if (!p.success) return falha(p.error.issues[0].message);
  const { id, ...data } = p.data;
  await db.trilha.update({ where: { id }, data });
  refresh();
  return { ok: true, msg: data.publicada ? 'Trilha salva e publicada.' : 'Trilha salva. Ela não aparece para os colaboradores enquanto não for publicada.' };
}

export async function excluirTrilha(id: string): Promise<Resultado> {
  await exigirEditorConteudo();
  if (!Id.safeParse(id).success) return falha('Trilha inválida.');
  if (await db.tentativa.count({ where: { curso: { etapa: { trilhaId: id } } } })) return falha('Alguém já fez quiz nesta trilha. Para não perder o histórico, despublique em vez de excluir.');
  await db.trilha.delete({ where: { id } });
  return { ok: true, msg: 'Trilha excluída.' };
}

/* ---------- Etapa ---------- */
export async function criarEtapa(trilhaId: string): Promise<Resultado> {
  await exigirEditorConteudo();
  if (!Id.safeParse(trilhaId).success) return falha('Trilha inválida.');
  const n = await db.etapa.count({ where: { trilhaId } });
  await db.etapa.create({ data: { trilhaId, nome: `Etapa ${n + 1}`, ordem: n } });
  refresh();
  return { ok: true, msg: 'Etapa criada.' };
}

const EtapaSchema = z.object({ id: Id, nome: texto(80).min(2, 'Dê um nome à etapa.'), descricao: texto(200) });
export async function salvarEtapa(dados: z.input<typeof EtapaSchema>): Promise<Resultado> {
  await exigirEditorConteudo();
  const p = EtapaSchema.safeParse(dados);
  if (!p.success) return falha(p.error.issues[0].message);
  await db.etapa.update({ where: { id: p.data.id }, data: { nome: p.data.nome, descricao: p.data.descricao } });
  refresh();
  return { ok: true, msg: 'Etapa salva.' };
}

export async function excluirEtapa(id: string): Promise<Resultado> {
  await exigirEditorConteudo();
  const e = Id.safeParse(id).success ? await db.etapa.findUnique({ where: { id }, include: { _count: { select: { cursos: true } } } }) : null;
  if (!e) return falha('Etapa não encontrada.');
  if (e._count.cursos) return falha('Mova ou exclua os cursos desta etapa antes de excluí-la.');
  await db.etapa.delete({ where: { id } });
  await reordenar('etapa', (await db.etapa.findMany({ where: { trilhaId: e.trilhaId }, orderBy: { ordem: 'asc' }, select: { id: true } })).map((x) => x.id));
  refresh();
  return { ok: true, msg: 'Etapa excluída.' };
}

/** Grava a ordem 0, 1, 2… na sequência de ids recebida */
async function reordenar(tipo: 'etapa' | 'curso', ids: string[]) {
  await db.$transaction(ids.map((id, ordem) => (tipo === 'etapa' ? db.etapa.update({ where: { id }, data: { ordem } }) : db.curso.update({ where: { id }, data: { ordem } }))));
}
const trocar = <T,>(lista: T[], i: number, j: number) => { const l = [...lista]; [l[i], l[j]] = [l[j], l[i]]; return l; };

export async function moverEtapa(id: string, dir: -1 | 1): Promise<Resultado> {
  await exigirEditorConteudo();
  if (!Id.safeParse(id).success || !Dir.safeParse(dir).success) return falha('Pedido inválido.');
  const e = await db.etapa.findUnique({ where: { id } });
  if (!e) return falha('Etapa não encontrada.');
  const ids = (await db.etapa.findMany({ where: { trilhaId: e.trilhaId }, orderBy: { ordem: 'asc' }, select: { id: true } })).map((x) => x.id);
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return { ok: true, msg: 'Nada mudou.' };
  await reordenar('etapa', trocar(ids, i, j));
  refresh();
  return { ok: true, msg: 'Ordem das etapas atualizada.' };
}

/* ---------- Curso ---------- */
export async function criarCurso(etapaId: string): Promise<Resultado> {
  await exigirEditorConteudo();
  if (!Id.safeParse(etapaId).success) return falha('Etapa inválida.');
  const n = await db.curso.count({ where: { etapaId } });
  const c = await db.curso.create({ data: { etapaId, titulo: 'Novo curso', publicado: false, ordem: n } });
  return { ok: true, msg: 'Curso criado. Ele fica oculto até você publicar.', id: c.id };
}

export async function moverCurso(id: string, dir: -1 | 1): Promise<Resultado> {
  await exigirEditorConteudo();
  if (!Id.safeParse(id).success || !Dir.safeParse(dir).success) return falha('Pedido inválido.');
  const c = await db.curso.findUnique({ where: { id } });
  if (!c) return falha('Curso não encontrado.');
  const ids = (await db.curso.findMany({ where: { etapaId: c.etapaId }, orderBy: { ordem: 'asc' }, select: { id: true } })).map((x) => x.id);
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return { ok: true, msg: 'Nada mudou.' };
  await reordenar('curso', trocar(ids, i, j));
  refresh();
  return { ok: true, msg: 'Ordem dos cursos atualizada.' };
}

const Link = z.string().trim().max(2000).refine(linkValido, 'Cole um link completo, começando com https://');
const CursoSchema = z.object({
  id: Id,
  etapaId: Id,
  titulo: texto(120).min(2, 'Dê um título ao curso.'),
  area: texto(60),
  resumo: texto(300),
  aprender: z.array(texto(120)).max(10, 'Use até 10 itens em "O que você vai aprender".'),
  texto: texto(20000),
  contato: texto(200),
  aprovacao: z.number().int().min(1, 'O mínimo de acertos precisa ser pelo menos 1.').max(50),
  publicado: z.boolean(),
  videos: z.array(z.object({ titulo: texto(120).min(1, 'Todo vídeo precisa de título.'), duracao: texto(20), url: z.union([z.literal(''), Link]) })).max(20),
  materiais: z.array(z.object({ titulo: texto(120).min(1, 'Todo material precisa de título.'), descricao: texto(200), url: Link })).max(30),
  perguntas: z.array(z.object({
    enunciado: texto(400).min(3, 'Toda pergunta precisa de enunciado.'),
    alternativas: z.array(texto(200).min(1, 'Preencha todas as alternativas ou remova as vazias.')).min(2, 'Cada pergunta precisa de pelo menos 2 alternativas.').max(6),
    correta: z.number().int().min(0),
  })).max(50),
});
export type CursoEdicao = z.input<typeof CursoSchema>;

/** Salva o curso inteiro: campos, vídeos, materiais e perguntas (as listas são substituídas pela versão da tela). */
export async function salvarCurso(dados: CursoEdicao): Promise<Resultado> {
  await exigirEditorConteudo();
  const p = CursoSchema.safeParse(dados);
  if (!p.success) return falha(p.error.issues[0].message);
  const d = p.data;
  const ruim = d.perguntas.findIndex((q) => q.correta >= q.alternativas.length);
  if (ruim >= 0) return falha(`Marque a alternativa correta da pergunta ${ruim + 1}.`);
  if (d.publicado && d.perguntas.length && d.aprovacao > d.perguntas.length) return falha(`O mínimo de acertos (${d.aprovacao}) é maior que o número de perguntas (${d.perguntas.length}).`);

  const atual = await db.curso.findUnique({ where: { id: d.id }, include: { etapa: true } });
  if (!atual) return falha('Curso não encontrado.');
  const destino = await db.etapa.findUnique({ where: { id: d.etapaId } });
  if (!destino || destino.trilhaId !== atual.etapa.trilhaId) return falha('Escolha uma etapa desta trilha.');
  const mudouEtapa = destino.id !== atual.etapaId;
  const ordem = mudouEtapa ? await db.curso.count({ where: { etapaId: destino.id } }) : atual.ordem;

  await db.$transaction([
    db.curso.update({ where: { id: d.id }, data: { etapaId: d.etapaId, ordem, titulo: d.titulo, area: d.area, resumo: d.resumo, aprender: d.aprender.filter(Boolean), texto: d.texto, contato: d.contato, aprovacao: d.aprovacao, publicado: d.publicado } }),
    db.video.deleteMany({ where: { cursoId: d.id } }),
    db.video.createMany({ data: d.videos.map((v, i) => ({ ...v, cursoId: d.id, ordem: i })) }),
    db.material.deleteMany({ where: { cursoId: d.id } }),
    db.material.createMany({ data: d.materiais.map((m, i) => ({ ...m, cursoId: d.id, ordem: i })) }),
    db.pergunta.deleteMany({ where: { cursoId: d.id } }),
    db.pergunta.createMany({ data: d.perguntas.map((q, i) => ({ ...q, cursoId: d.id, ordem: i })) }),
  ]);
  if (mudouEtapa) await reordenar('curso', (await db.curso.findMany({ where: { etapaId: atual.etapaId }, orderBy: { ordem: 'asc' }, select: { id: true } })).map((x) => x.id));
  refresh();
  return { ok: true, msg: d.publicado ? 'Curso salvo e publicado.' : 'Curso salvo. Ele fica oculto até você publicar.' };
}

export async function excluirCurso(id: string): Promise<Resultado> {
  await exigirEditorConteudo();
  const c = Id.safeParse(id).success ? await db.curso.findUnique({ where: { id }, include: { etapa: true, _count: { select: { tentativas: true } } } }) : null;
  if (!c) return falha('Curso não encontrado.');
  if (c._count.tentativas) return falha('Alguém já fez o quiz deste curso. Para não perder o histórico, despublique em vez de excluir.');
  await db.curso.delete({ where: { id } });
  await reordenar('curso', (await db.curso.findMany({ where: { etapaId: c.etapaId }, orderBy: { ordem: 'asc' }, select: { id: true } })).map((x) => x.id));
  return { ok: true, msg: 'Curso excluído.', id: c.etapa.trilhaId };
}
