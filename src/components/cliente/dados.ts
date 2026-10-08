import 'server-only';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { agora, situacao } from '@/lib/datas';
import { cnpjValido, soNumeros } from '@/lib/formato';
import { clienteAtual } from '@/lib/sessao';
import { FIM_AGENDA, turmasDoPeriodo } from '@/lib/turmas';
import { canalDe, type CtxInscricao, type Ident, type TurmaCli } from './comum';

export type ParamsCliente = Record<string, string | string[] | undefined>;
export const param = (sp: ParamsCliente, k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);

export type AoVivo = TurmaCli & { pessoas: number; minutos: number };
export type ProximaAula = { turma: TurmaCli; codigo: string | null };

/**
 * Contexto do cliente para as páginas Início e Aulas ao vivo:
 * identificação (cookie ou CNPJ do link), turmas de hoje até o fim da agenda, inscrições e aula ao vivo agora.
 */
export async function contextoCliente(sp: ParamsCliente) {
  await connection(); // usa o relógio: sempre na hora do pedido
  const cliente = await clienteAtual();
  const n = agora();
  const canal = canalDe(param(sp, 'canal'));

  // Identificação: CNPJ do link (grupo/botão) tem prioridade sobre o cookie quando é outro restaurante
  const cnpjUrl = soNumeros(param(sp, 'cnpj') ?? '');
  let ident: Ident = { tipo: 'nenhum' };
  let restauranteId: string | null = null;
  if (cnpjUrl && cnpjValido(cnpjUrl) && cliente?.cnpj !== cnpjUrl) {
    const r = await db.restaurante.findUnique({ where: { cnpj: cnpjUrl }, select: { id: true, nome: true } });
    ident = { tipo: 'url', cnpj: cnpjUrl, restaurante: r?.nome ?? null };
    restauranteId = r?.id ?? null;
  } else if (cliente) {
    ident = { tipo: 'cookie', cnpj: cliente.cnpj, restaurante: cliente.nome };
    restauranteId = cliente.restauranteId;
  }
  // A pessoa só é conhecida se o cookie é do mesmo restaurante
  const pessoa = cliente && cliente.restauranteId === restauranteId && cliente.pessoa && cliente.whatsapp
    ? { nome: cliente.pessoa, whatsapp: cliente.whatsapp }
    : null;

  const todas = await turmasDoPeriodo(n.data, FIM_AGENDA);
  const turmas: TurmaCli[] = todas
    .map((t) => ({ id: t.id, data: t.data, hora: t.hora, tema: t.tema, sit: situacao(t) }))
    .filter((t) => t.sit !== 'realizada');

  const insc = restauranteId
    ? await db.inscricao.findMany({
        where: { restauranteId, ...(pessoa ? { whatsapp: pessoa.whatsapp } : {}), turma: { data: { gte: n.data } } },
        select: { turmaId: true, codigo: true },
      })
    : [];
  const minhas = [...new Set(insc.map((i) => i.turmaId))];
  const codigos: Record<string, string> = pessoa ? Object.fromEntries(insc.map((i) => [i.turmaId, i.codigo])) : {};

  const vivo = turmas.find((t) => t.sit === 'ao-vivo') ?? null;
  let aoVivo: AoVivo | null = null;
  if (vivo) {
    const pessoas = await db.inscricao.count({ where: { turmaId: vivo.id, entrouEm: { not: null }, saiuEm: null } });
    aoVivo = { ...vivo, pessoas, minutos: Math.max(0, Math.round((n.hora - vivo.hora) * 60)) };
  }

  const porId = new Map(turmas.map((t) => [t.id, t]));
  const proximas: ProximaAula[] = minhas
    .map((id) => porId.get(id))
    .filter((t): t is TurmaCli => !!t && (t.sit === 'agendada' || t.sit === 'ao-vivo'))
    .sort((a, b) => a.data.localeCompare(b.data) || a.hora - b.hora)
    .map((t) => ({ turma: t, codigo: codigos[t.id] ?? null }));

  const ctx: CtxInscricao = { hoje: n.data, turmas, minhas, codigos, ident, pessoa, canal };
  return { ctx, aoVivo, proximas, identificado: ident.tipo !== 'nenhum' && restauranteId !== null, cnpjUrl: ident.tipo === 'url' ? cnpjUrl : null };
}
